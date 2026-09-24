// Run inside the Docker backend before using the copied application.
const fs = require('node:fs');
const mysql = require('/app/node_modules/mysql2/promise');
(async () => {
  const manifest = JSON.parse(fs.readFileSync('/verification/manifest.json', 'utf8'));
  const connection = await mysql.createConnection({ host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    for (const [table, expected] of Object.entries(manifest.counts)) {
      const [[{ count }]] = await connection.query('SELECT COUNT(*) AS count FROM ??', [table]);
      if (Number(count) !== Number(expected)) throw new Error(`${table}: expected ${expected} rows, found ${count}`);
      console.log(`${table}: ${count} rows verified`);
    }
  } finally { await connection.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
