// Read-only export of the local database, plus isolated copies for Docker.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const dotenv = require('../backend/node_modules/dotenv');
const mysql = require('../backend/node_modules/mysql2/promise');
const root = path.resolve(__dirname, '..');

async function main() {
  const destination = path.join(root, 'docker-state');
  const envPath = path.join(root, '.env.docker');
  if (fs.existsSync(destination) || fs.existsSync(envPath)) {
    throw new Error('Docker copies already exist. Nothing was overwritten. Use the existing setup or archive it before making another copy.');
  }
  const config = dotenv.parse(fs.readFileSync(path.join(root, 'backend/.env')));
  if (!config.JWT_SECRET) throw new Error('backend/.env needs JWT_SECRET before starting the backend.');
  if (!fs.existsSync(path.join(root, 'backend/configs/serviceAccountKey.json'))) {
    throw new Error('The existing Firebase serviceAccountKey.json file is required.');
  }
  const dump = process.env.MYSQLDUMP_PATH || 'C:/xampp/mysql/bin/mysqldump.exe';
  if (!fs.existsSync(dump)) throw new Error('Set MYSQLDUMP_PATH to your mysqldump executable.');
  const database = config.DB_NAME || 'poverty_prediction_db';
  const connection = await mysql.createConnection({
    host: config.DB_HOST || '127.0.0.1', port: Number(config.DB_PORT || 3306),
    user: config.DB_USER || 'root', password: config.DB_PASSWORD || '', database,
  });
  let manifest;
  try {
    const [[{ version }]] = await connection.query('SELECT VERSION() AS version');
    if (!version.includes('MariaDB')) throw new Error('This setup targets the project’s XAMPP/MariaDB database. Check the database image before migrating a different server.');
    const [tables] = await connection.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
    const counts = {};
    for (const row of tables) {
      const table = Object.values(row)[0];
      const [[{ count }]] = await connection.query('SELECT COUNT(*) AS count FROM ??', [table]);
      counts[table] = count;
    }
    manifest = { exportedAt: new Date().toISOString(), database, sourceVersion: version, counts };
  } finally {
    await connection.end();
  }
  const staging = path.join(root, `docker-snapshot-${Date.now()}`);
  fs.mkdirSync(staging);
  const output = path.join(staging, 'database.sql');
  const result = spawnSync(dump, [
    '--host=' + (config.DB_HOST || '127.0.0.1'), '--port=' + (config.DB_PORT || '3306'),
    '--user=' + (config.DB_USER || 'root'), '--single-transaction', '--quick',
    '--routines', '--events', '--triggers', '--hex-blob', '--skip-add-drop-table',
    '--result-file=' + output, database,
  ], { env: { ...process.env, MYSQL_PWD: config.DB_PASSWORD || '' }, encoding: 'utf8', windowsHide: true });
  if (result.error || result.status !== 0 || !fs.statSync(output).size) {
    throw new Error('Database export failed. Original data is unchanged. ' + (result.error?.message || result.stderr || ''));
  }
  fs.cpSync(path.join(root, 'ml/data'), path.join(staging, 'ml-data'), { recursive: true, errorOnExist: true, force: false });
  fs.cpSync(path.join(root, 'ml/saved_models'), path.join(staging, 'saved-models'), { recursive: true, errorOnExist: true, force: false });
  fs.writeFileSync(path.join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2));
  // Each file is new; refuse to replace previous Docker credentials or snapshots.
  fs.writeFileSync(envPath,
    `DOCKER_DB_PASSWORD=${crypto.randomBytes(24).toString('hex')}\nDOCKER_ROOT_PASSWORD=${crypto.randomBytes(24).toString('hex')}\n`,
    { flag: 'wx' });
  fs.renameSync(staging, destination);
  console.log('Prepared Docker copies. Original database, uploads and models were not changed.');
  console.log('Table counts:', JSON.stringify(manifest.counts));
}

main().catch(error => { console.error('Preparation stopped:', error.code === 'ECONNREFUSED' ? 'Start MySQL in XAMPP, then try again.' : error.message); process.exitCode = 1; });
