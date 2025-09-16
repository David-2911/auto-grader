#!/usr/bin/env node
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/make-admin.js <email>');
    process.exit(1);
  }
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'auto_grade',
  });
  try {
    const [rows] = await db.query('SELECT id, role FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      console.error(`No user found with email ${email}`);
      process.exit(2);
    }
    const user = rows[0];
    if (user.role === 'admin') {
      console.log(`${email} is already an admin.`);
      process.exit(0);
    }
    await db.query('UPDATE users SET role = ? WHERE id = ?', ['admin', user.id]);
    console.log(`Promoted ${email} (id=${user.id}) to admin.`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to promote user:', err.message);
    process.exit(1);
  } finally {
    await db.end();
  }
})();
