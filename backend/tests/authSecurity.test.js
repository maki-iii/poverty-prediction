const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Exercise the real HTTP routes/services with isolated account, mail and Firebase
// adapters. No production database, email recipient or Firebase account is touched.
let account, identity, tokenError, writes, sentOtp, verified, created;
function stub(path, exports) {
  const id = require.resolve(path);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}
stub("../configs/db", {});
stub("../configs/firebaseAdmin", { auth: () => ({
  verifyIdToken: async (token, checkRevoked) => {
    verified.push({ token, checkRevoked });
    if (tokenError) throw tokenError;
    return identity;
  },
}) });
stub("../models/userModel", {
  findByEmail: async () => account,
  findByUsername: async () => account,
  findById: async () => created,
  create: async data => { created = { ...data, id: 10 }; return 10; },
  updatePassword: async (id, hash) => { writes.push({ id, hash }); },
});
stub("../services/auditLogService", { log: async () => {}, ACTIONS: {} });
stub("../services/otp/emailService", { sendOTP: async (_, otp) => { sentOtp = otp; } });
process.env.JWT_SECRET = "isolated-security-test-secret-not-used-outside-tests";
const app = require("../index");
const service = require("../services/userService");
const { createOtpService } = require("../services/otp/otpService");
let server, base, sequence = 0;
before(async () => {
  server = await new Promise(resolve => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
beforeEach(() => {
  account = { id: 1, name: "Example", email: `person${sequence++}@example.com`, uid: "trusted-uid", role: "user", username: "example" };
  identity = { uid: account.uid, email: account.email, email_verified: true, name: "Example", firebase: { sign_in_provider: "google.com" } };
  tokenError = null; writes = []; verified = []; created = null; sentOtp = null;
});
const post = (path, body) => fetch(base + path, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

test("administrator seeding is unavailable over HTTP", async () => {
  for (const method of ["GET", "POST"]) {
    const response = await fetch(base + "/api/seed/seed-admin", { method });
    assert.equal(response.status, 404);
  }
});
test("password reset without OTP proof cannot change an account", async () => {
  const response = await post("/api/otp/reset-password", { email: account.email, newPassword: "Strong!Password1" });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "RESET_AUTH_REQUIRED");
  assert.deepEqual(writes, []);
});
test("OTP flow changes the password once and rejects token replay", async () => {
  assert.equal((await post("/api/otp/send", { email: account.email })).status, 200);
  const response = await post("/api/otp/verify", { email: account.email, otp: sentOtp });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const { resetToken } = await response.json();
  assert.equal(resetToken.length, 64);
  const body = { email: account.email, newPassword: "Strong!Password1", resetToken };
  const outcomes = await Promise.all([post("/api/otp/reset-password", body), post("/api/otp/reset-password", body)]);
  assert.deepEqual(outcomes.map(r => r.status).sort(), [200, 400]);
  assert.equal(writes.length, 1);
  assert.equal(await bcrypt.compare(body.newPassword, writes[0].hash), true);
});
test("OTP proof is bound to its email, expires, and is invalidated by resend", () => {
  let time = 0;
  const otp = createOtpService(() => time);
  const code = otp.generate("a@example.com");
  const token = otp.verify("a@example.com", code);
  assert.throws(() => otp.consumeReset("b@example.com", token));
  assert.throws(() => otp.consumeReset("a@example.com", "forged"));
  time = 60_001;
  const next = otp.generate("a@example.com");
  assert.throws(() => otp.consumeReset("a@example.com", token));
  const newToken = otp.verify("a@example.com", next);
  time += 300_000;
  assert.throws(() => otp.consumeReset("a@example.com", newToken));
});
test("OTP limits guesses and resend frequency, and cannot be verified twice", () => {
  const otp = createOtpService();
  const code = otp.generate("a@example.com");
  assert.throws(() => otp.generate("a@example.com"), /one minute/);
  for (let i = 0; i < 5; i++) assert.throws(() => otp.verify("a@example.com", "wrong"));
  assert.throws(() => otp.verify("a@example.com", code));
  const other = otp.generate("b@example.com");
  const token = otp.verify("b@example.com", other);
  assert.throws(() => otp.verify("b@example.com", other));
  otp.consumeReset("b@example.com", token);
  assert.throws(() => otp.consumeReset("b@example.com", token));
});
test("unverified OTPs expire and email normalization is consistent", () => {
  let time = 0;
  const otp = createOtpService(() => time);
  const code = otp.generate(" A@Example.com ");
  const token = otp.verify("a@example.com", code);
  otp.consumeReset(" A@example.com ", token);
  const expired = otp.generate("b@example.com");
  time = 300_000;
  assert.throws(() => otp.verify("b@example.com", expired));
});
test("social login rejects browser-asserted identity and invalid Firebase tokens", async () => {
  let response = await post("/api/users/social-login", { email: account.email, uid: account.uid, name: "Admin" });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(verified.length, 0);
  tokenError = new Error("expired, forged or revoked");
  response = await post("/api/users/social-login", { idToken: "invalid" });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.deepEqual(verified, [{ token: "invalid", checkRevoked: true }]);
});
test("social login uses verified identity and the stored role, ignoring forged fields", async () => {
  const response = await post("/api/users/social-login", {
    idToken: "valid-token", uid: "attacker", email: "admin@example.com", role: "super_admin",
  });
  assert.equal(response.status, 200);
  const { user } = await response.json();
  assert.equal(user.email, account.email);
  assert.equal(user.role, "user");
  assert.match(response.headers.get("set-cookie"), /HttpOnly/);
  assert.deepEqual(verified, [{ token: "valid-token", checkRevoked: true }]);
});
test("social login cannot link a password account or a different Firebase user", async () => {
  for (const uid of [null, "different-uid"]) {
    account.uid = uid;
    const response = await post("/api/users/social-login", { idToken: "valid-token" });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("set-cookie"), null);
  }
});
test("social login rejects unverified emails and unsupported providers", async () => {
  identity.email_verified = false;
  await assert.rejects(service.socialLogin({ idToken: "valid" }), /verified/);
  identity.email_verified = true;
  identity.firebase.sign_in_provider = "password";
  await assert.rejects(service.socialLogin({ idToken: "valid" }), /verified/);
});
test("new social accounts receive an unpredictable password instead of their UID", async () => {
  account = null;
  identity.firebase.sign_in_provider = "facebook.com";
  const result = await service.socialLogin({ idToken: "valid" });
  assert.equal(result.role, "user");
  assert.equal(created.uid, identity.uid);
  assert.notEqual(created.password, identity.uid);
  assert.equal(created.password.length, 64);
});
test("legacy public UID password is rejected while ordinary password login works", async () => {
  await assert.rejects(service.login({ username: "example", password: account.uid }), /social sign-in/);
  account.uid = null;
  account.password = await bcrypt.hash("Strong!Password1", 10);
  assert.equal((await service.login({ username: "example", password: "Strong!Password1" })).id, account.id);
  await assert.rejects(service.login({ username: "example", password: "wrong" }), /Invalid/);
});

test("signed-in users cannot change another account's email or password", async () => {
  for (const role of ["user", "admin"]) {
    const token = jwt.sign({ id: 2, role }, process.env.JWT_SECRET);
    for (const [method, path] of [["GET", "/api/users/1"], ["PUT", "/api/users/1"], ["PUT", "/api/users/1/change-password"]]) {
      const response = await fetch(base + path, { method, headers: { Cookie: `token=${token}` } });
      assert.equal(response.status, 403);
    }
  }
  assert.equal(writes.length, 0);
});

test("account owners and super administrators retain profile access", async () => {
  created = account;
  for (const actor of [{ id: 1, role: "user" }, { id: 2, role: "super_admin" }]) {
    const token = jwt.sign(actor, process.env.JWT_SECRET);
    const response = await fetch(base + "/api/users/1", { headers: { Cookie: `token=${token}` } });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).id, 1);
  }
});
