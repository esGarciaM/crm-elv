/**
 * Seed script for package_checklist_items
 * Run: docker exec crm-backend-1 node /app/seed-checklist.js
 *
 * This will replace all existing checklist items with the canonical set.
 */

import db from './database.js';

const items = [
  ['welcome_post', 'Post de bienvenida', 10],
  ['event_ticket', 'Boleto al evento', 20],
  ['promo_post', 'Post promocional en redes sociales del simposio', 30],
  ['logo_main_banner', 'Logo en lona principal', 40],
  ['event_day_mention', 'Mención el día del evento', 50],
  ['company_social_post', 'Elaboración de un post para redes de la empresa', 60],
  ['vacancy_promotion', 'Difusión de vacantes u oferta en redes sociales del simposio', 70],
  ['marketing_workshop', 'Acceso a taller de marketing', 80],
  ['logo_event_screen', 'Logo en pantalla del evento', 90],
  ['kit_relindo', 'KIT relindo oficial', 100],
  ['social_story_design', '1 diseño para historia para redes sociales de la empresa', 110],
  ['promo_video_30s', '1 video promocional en redes (30 seg max)', 120],
  ['lobby_activation', 'Espacio para activación en el lobby del evento', 130],
  ['promo_video_1min', 'Video promocional en redes sociales (1 min max)', 140],
  ['press_conference', 'Rueda de prensa', 150],
  ['sponsor_brunch', 'Brunch con patrocinadores', 160],
  ['photo_with_speakers', 'Foto con conferencistas oficiales', 170],
];

const txn = db.transaction(() => {
  // Clear existing assignments first (FK constraint)
  db.exec('DELETE FROM package_checklist');
  db.exec('DELETE FROM package_checklist_items');

  const insert = db.prepare('INSERT INTO package_checklist_items (key, label, sort_order) VALUES (?, ?, ?)');
  for (const it of items) {
    insert.run(...it);
  }
});

txn();

console.log(`✅ Seed completo: ${items.length} elementos de checklist insertados.`);
