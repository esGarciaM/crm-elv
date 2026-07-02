/**
 * Seed script for packages
 * Run: docker exec crm-backend-1 node /app/seed-packages.js
 *
 * This will replace all existing packages with the canonical set.
 */

import db from './database.js';

const packages = [
  ['General admisión',    0,     'monetario', 1],
  ['Vip pass',            0,     'monetario', 2],
  ['Platinum pass',       0,     'monetario', 3],
  ['Meet and greet',      0,     'monetario', 4],
];

const txn = db.transaction(() => {
  // Clear existing assignments first (FK constraint via package_checklist)
  db.exec('DELETE FROM package_checklist');
  db.exec('DELETE FROM packages');

  const insert = db.prepare(
    'INSERT INTO packages (name, amount, type, sort_order) VALUES (?, ?, ?, ?)'
  );
  for (const pkg of packages) {
    insert.run(...pkg);
  }
});

txn();

console.log(`✅ Seed completo: ${packages.length} paquetes insertados.`);
console.log('');
console.log('Paquetes creados:');
packages.forEach((p, i) => {
  console.log(`  ${i + 1}. ${p[0]}${p[1] ? ` ($${p[1]})` : ''}`);
});
