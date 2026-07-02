import db from './database.js';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

console.log('🌱 Seeding sample data...');

// ── Clean existing data ──
db.exec('DELETE FROM patrocinio_documents');
db.exec('DELETE FROM patrocinios');
db.exec('DELETE FROM task_comments');
db.exec('DELETE FROM tasks');
db.exec('DELETE FROM clients');
db.exec('DELETE FROM users');

// ── Users ──
const users = [
  { username: 'admin', password: 'admin123', name: 'Administrador', role: 'admin' },
  { username: 'montse', password: '123456', name: 'Montserrat Arévalo', role: 'user' },
  { username: 'alberto', password: '123456', name: 'Alberto Lara', role: 'user' },
  { username: 'ilse', password: '123456', name: 'Hernández Muñoz Ilse', role: 'user' },
  { username: 'ixel', password: '123456', name: 'Ixel Antonio', role: 'user' },
  { username: 'alfredo', password: '123456', name: 'Alfredo Contreras', role: 'user' },
  { username: 'invitado', password: '123456', name: 'Invitado', role: 'viewer' },
  { username: 'krikri', password: '123456', name: 'Kri Kri (Cliente)', role: 'client' },
];

const userIds = users.map((u) => {
  const hash = bcrypt.hashSync(u.password, 10);
  const info = db.prepare(
    'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)'
  ).run(u.username, hash, u.name, u.role);
  return info.lastInsertRowid;
});

const [adminId, montseId, albertoId, ilseId, ixelId, alfredoId, invitadoId, krikriId] = userIds;

console.log(`  ✓ ${users.length} usuarios creados`);

// ── Clients (Patrocinadores) ──
const now = "datetime('now','localtime')";

const clients = [
  { company_name: 'Kri Kri', contact_person: null, phone: null, sponsorship_type: 'Especie', package: 'Presente E (3000)', visit_status: 'Visitado', payment_status: 'Pagado', student_obtained: 'Abigail Loera', student_contacted: 'Montserrat Arévalo', in_kind_detail: '1 hora de simulador de beisbol', payment_detail: null, social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: null, created_by: montseId, client_user_id: krikriId },
  { company_name: 'Jei Coquetas', contact_person: 'Adrianna Torres', phone: '8671026436', sponsorship_type: 'Especie', package: 'Origen E (1000)', visit_status: 'En linea', payment_status: 'Pagado', student_obtained: 'Adrian Gonzalez', student_contacted: 'Montserrat Arévalo', in_kind_detail: '3 termos personalizados con la "T"', payment_detail: null, social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: null, created_by: montseId },
  { company_name: "Nando's Barber Shop", contact_person: 'Fernando Pérez', phone: '867-231-6549', sponsorship_type: 'Especie', package: 'Origen E (1000)', visit_status: 'En linea', payment_status: 'Pagado', student_obtained: 'Adrian Gonzalez', student_contacted: 'Montserrat Arévalo', in_kind_detail: '5 cortes de pelo de $200 c/u', payment_detail: null, social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: null, created_by: montseId },
  { company_name: 'The Snack Club', contact_person: 'Ana Sanchez', phone: '867 146 2901', sponsorship_type: 'Monetario', package: 'Origen ($$1000)', visit_status: 'Visitado', payment_status: 'Pagado', student_obtained: 'Alan Alvarez', student_contacted: 'Alan Alvarez', in_kind_detail: null, payment_detail: null, social_media_fulfilled: 'Cumplido', tickets_delivered: 'No', logo_requested: null, notes: null, created_by: adminId },
  { company_name: 'Lumbreras GYM', contact_person: 'Alejandra Lumbreras', phone: null, sponsorship_type: 'Especie', package: 'Legado E (6500)', visit_status: 'Visitado', payment_status: 'Pendiente', student_obtained: 'Alan Álvarez', student_contacted: 'Alan Alvarez', in_kind_detail: null, payment_detail: null, social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: null, created_by: adminId },
  { company_name: 'Jr Photography', contact_person: null, phone: null, sponsorship_type: 'Especie', package: 'Presente E (3000)', visit_status: 'Visitado', payment_status: 'Pagado', student_obtained: 'Alan Vallejo', student_contacted: 'Montserrat Arévalo', in_kind_detail: '2 sesiones de fotos ($1500 c/u)', payment_detail: null, social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: null, created_by: montseId },
  { company_name: 'Qualitas', contact_person: null, phone: null, sponsorship_type: 'Monetario', package: 'Legado ($$6000)', visit_status: 'Visitado', payment_status: 'Pendiente', student_obtained: 'Alan Vallejo', student_contacted: 'Montserrat Arevalo', in_kind_detail: null, payment_detail: null, social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: 'Pendiente de firma de contrato', created_by: montseId },
  { company_name: 'Control de Carga', contact_person: 'Juan Garza', phone: '867-464-3931', sponsorship_type: 'Monetario', package: 'Futuro ($$3500)', visit_status: 'Visitado', payment_status: 'Pagado', student_obtained: 'Alberto Lara', student_contacted: 'Alberto Lara', in_kind_detail: null, payment_detail: null, social_media_fulfilled: null, tickets_delivered: 'No', logo_requested: null, notes: null, created_by: albertoId },
  { company_name: 'SAMCASE', contact_person: 'Samantha Hernández', phone: '867142393', sponsorship_type: 'Monetario', package: 'Origen ($$1000)', visit_status: 'En linea', payment_status: 'Pagado', student_obtained: 'Alberto Lara', student_contacted: 'Alberto Lara', in_kind_detail: '2 AIRPODS PRO OEM', payment_detail: null, social_media_fulfilled: null, tickets_delivered: 'No', logo_requested: null, notes: null, created_by: albertoId },
  { company_name: 'Soy Andy Ramirez', contact_person: 'Andrea Ramirez', phone: null, sponsorship_type: 'Monetario', package: 'Futuro ($$3500)', visit_status: 'Visitado', payment_status: 'Pagado', student_obtained: 'Alberto Lara', student_contacted: 'Alberto Lara', in_kind_detail: null, payment_detail: null, social_media_fulfilled: null, tickets_delivered: 'No', logo_requested: null, notes: 'Cliente referido', created_by: albertoId },
  { company_name: 'Abstract Agencia Creativa', contact_person: 'Saúl Toga', phone: '8672420687', sponsorship_type: 'Monetario', package: 'Origen ($$1000)', visit_status: 'Visitado', payment_status: 'Pendiente', student_obtained: 'Alfredo Contreras', student_contacted: 'Alfredo Contreras', in_kind_detail: null, payment_detail: null, social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: null, created_by: alfredoId },
  { company_name: 'RAMZA Limpieza', contact_person: 'Manuel', phone: '8671556918', sponsorship_type: 'Monetario', package: 'Origen ($$1000)', visit_status: 'Visitado', payment_status: 'Pendiente', student_obtained: 'Alfredo Contreras', student_contacted: 'Alfredo Contreras', in_kind_detail: null, payment_detail: null, social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: 'Llamar para seguimiento', created_by: alfredoId },
  { company_name: 'Jazmed Decoración', contact_person: null, phone: null, sponsorship_type: 'Especie', package: 'Presente E (3000)', visit_status: 'En linea', payment_status: 'Pagado', student_obtained: 'Anadalay', student_contacted: 'Montserrat Arévalo', in_kind_detail: '2 cupones decoración $1000 y 2 cupones $500', payment_detail: null, social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: null, created_by: montseId },
  { company_name: 'La Sociedad', contact_person: 'Inés Corona', phone: null, sponsorship_type: 'Especie', package: 'Presente E (3000)', visit_status: 'Visitado', payment_status: 'Pendiente', student_obtained: 'Anahí Rocha', student_contacted: 'Judith Rodríguez', in_kind_detail: 'Brownies para el evento', payment_detail: null, social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: null, created_by: adminId },
  { company_name: "D'Liza", contact_person: 'Liza Zavala', phone: null, sponsorship_type: 'Monetario', package: 'Origen ($$1000)', visit_status: 'Visitado', payment_status: 'Pagado', student_obtained: 'Andrea Reyes', student_contacted: 'Montserrat Arévalo', in_kind_detail: null, payment_detail: null, social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: null, created_by: montseId },
  { company_name: 'Elissbellis', contact_person: 'Beli Sandoval', phone: null, sponsorship_type: 'Especie', package: 'Legado E (6500)', visit_status: 'Visitado', payment_status: 'Abonado', student_obtained: 'Andrea Reyes', student_contacted: 'Montserrat Arévalo', in_kind_detail: '65 Iced Coffee', payment_detail: 'Abonó $2,000', social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: null, created_by: montseId },
  { company_name: 'Ohlala', contact_person: null, phone: null, sponsorship_type: 'Monetario', package: 'Legado ($$6000)', visit_status: 'Visitado', payment_status: 'Pagado', student_obtained: 'Andrea Reyes', student_contacted: 'Montserrat Arévalo', in_kind_detail: null, payment_detail: null, social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: 'Pago completo', created_by: montseId },
  { company_name: 'PEQUE Clicks', contact_person: 'Jean Cevallos', phone: null, sponsorship_type: 'Especie/Monetario', package: 'Legado E (6500)', visit_status: 'Visitado', payment_status: 'Pagado', student_obtained: 'Andrea Reyes', student_contacted: 'Montserrat Arévalo', in_kind_detail: 'Fotografía en el evento y dinero en efectivo', payment_detail: '$2,500', social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: null, created_by: montseId },
  { company_name: 'SOLUCIONES CIM', contact_person: 'Abraham Muñoz Camacho', phone: '33 1888 8342', sponsorship_type: 'Monetario', package: 'Legado ($$6000)', visit_status: 'Visitado', payment_status: 'Pagado', student_obtained: 'Berenice Hernández', student_contacted: 'Miguel León', in_kind_detail: null, payment_detail: null, social_media_fulfilled: null, tickets_delivered: 'No', logo_requested: null, notes: 'Pago por transferencia', created_by: albertoId },
  { company_name: 'FarmaSoluciones', contact_person: 'María López', phone: '8671234567', sponsorship_type: 'Monetario', package: 'Presente ($$2500)', visit_status: 'Visita agendada', payment_status: 'Pendiente', student_obtained: 'Ixel Antonio', student_contacted: 'Ixel Antonio', in_kind_detail: null, payment_detail: null, social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: 'Visita agendada para próxima semana', created_by: ixelId },
  { company_name: 'Bienestar Quiropráctico', contact_person: 'Diego López', phone: null, sponsorship_type: 'Monetario', package: 'Origen ($$1000)', visit_status: 'Visitado', payment_status: 'Pagado', student_obtained: 'Diego López', student_contacted: 'Montserrat Arévalo', in_kind_detail: null, payment_detail: null, social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: null, created_by: montseId },
  { company_name: 'Laredo Clean', contact_person: 'Diego López', phone: null, sponsorship_type: 'Monetario', package: 'Futuro ($$3500)', visit_status: 'En linea', payment_status: 'Abonado', student_obtained: 'Diego López', student_contacted: 'Montserrat Arévalo', in_kind_detail: null, payment_detail: 'Abonó $1,500', social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: 'Saldo pendiente $2,000', created_by: montseId },
  { company_name: 'Revelez Tattoo', contact_person: 'Diego López', phone: null, sponsorship_type: 'Especie', package: 'Origen E (1000)', visit_status: 'Visitado', payment_status: 'Pagado', student_obtained: 'Diego López', student_contacted: 'Montserrat Arévalo', in_kind_detail: '3 tatuajes de 10-15 cm en tinta negra', payment_detail: null, social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: null, created_by: montseId },
  { company_name: 'The Cake', contact_person: 'Daniela Saldivar', phone: '867 193 6807', sponsorship_type: 'Especie', package: 'Futuro E (4500)', visit_status: 'Visita agendada', payment_status: 'Pagado', student_obtained: 'Armando Romero', student_contacted: 'Armando Romero', in_kind_detail: 'Brunch para rueda de prensa', payment_detail: null, social_media_fulfilled: null, tickets_delivered: 'Entregados', logo_requested: null, notes: null, created_by: adminId },
  { company_name: 'BlueNote', contact_person: 'Saúl', phone: '867 167 6700', sponsorship_type: 'Especie', package: 'Legado E (6500)', visit_status: 'Visitado', payment_status: 'Pagado', student_obtained: 'Ilse Hernández', student_contacted: 'Ilse Hernández', in_kind_detail: 'Música en vivo durante el evento', payment_detail: null, social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: null, created_by: ilseId },
  { company_name: 'Papelería Laredo', contact_person: null, phone: null, sponsorship_type: 'Especie', package: 'Legado E (6500)', visit_status: 'Visitado', payment_status: 'Pagado', student_obtained: 'Ilse Hernández', student_contacted: 'Ilse Hernández', in_kind_detail: 'Kits de papelería', payment_detail: null, social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: null, created_by: ilseId },
  { company_name: 'FEMA', contact_person: 'Berenice', phone: null, sponsorship_type: 'Especie', package: 'Legado E (6500)', visit_status: 'Visitado', payment_status: 'Pagado', student_obtained: 'Ilse Hernández', student_contacted: 'Ilse Hernández', in_kind_detail: 'Toldos para Mercaday', payment_detail: null, social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: null, created_by: ilseId },
  { company_name: 'La20Barbershop', contact_person: null, phone: null, sponsorship_type: 'Especie', package: 'Presente ($$2500)', visit_status: 'Visitado', payment_status: 'Abonado', student_obtained: 'Erik Padrón Pérez', student_contacted: 'Alfredo Contreras', in_kind_detail: 'Mitad efectivo y 15 cortes de pelo ($200 c/u)', payment_detail: 'Abonó $1,000 + cortes', social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: null, created_by: alfredoId },
  { company_name: 'TERA', contact_person: null, phone: null, sponsorship_type: 'Monetario', package: 'Legado ($$6000)', visit_status: 'Visitado', payment_status: 'Pagado', student_obtained: 'Fabiola Martinez', student_contacted: 'Fabiola Martinez', in_kind_detail: null, payment_detail: null, social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: null, created_by: adminId },
  { company_name: 'Casino Centenario', contact_person: 'René Peña', phone: null, sponsorship_type: 'Monetario', package: 'Legado ($$6000)', visit_status: 'Visitado', payment_status: 'Pagado', student_obtained: 'Fabiola Martinez', student_contacted: 'Fabiola Martinez', in_kind_detail: null, payment_detail: null, social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: null, created_by: adminId },
  { company_name: 'LAPTSTORE', contact_person: 'Pedro Martinez', phone: '8673754025', sponsorship_type: 'Monetario', package: 'Presente ($$2500)', visit_status: 'Visitado', payment_status: 'Pendiente', student_obtained: 'Marco Gomez', student_contacted: 'Alberto Lara', in_kind_detail: null, payment_detail: 'PENDIENTE 1 BOLETO ADICIONAL', social_media_fulfilled: null, tickets_delivered: 'No', logo_requested: null, notes: null, created_by: albertoId },
  { company_name: 'Meow Berry', contact_person: 'Marilyn', phone: null, sponsorship_type: 'Especie', package: 'Origen E (1000)', visit_status: 'Visitado', payment_status: 'Pagado', student_obtained: 'Marilyn Santizo', student_contacted: 'Montserrat Arévalo', in_kind_detail: '5 mystery box de accesorios', payment_detail: null, social_media_fulfilled: null, tickets_delivered: null, logo_requested: null, notes: null, created_by: montseId },
];

const clientIds = clients.map((c) => {
  const info = db.prepare(`
    INSERT INTO clients (company_name, contact_person, phone, sponsorship_type, package,
      visit_status, payment_status, student_obtained, student_contacted,
      in_kind_detail, payment_detail, social_media_fulfilled, tickets_delivered,
      logo_requested, notes, created_by, client_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(c.company_name, c.contact_person, c.phone, c.sponsorship_type, c.package,
    c.visit_status, c.payment_status, c.student_obtained, c.student_contacted,
    c.in_kind_detail, c.payment_detail, c.social_media_fulfilled, c.tickets_delivered,
    c.logo_requested, c.notes, c.created_by, c.client_user_id ?? null);
  return info.lastInsertRowid;
});

console.log(`  ✓ ${clients.length} patrocinadores creados`);

// ── Tasks ──
const tasks = [
  { title: 'Diseñar logo para Jei Coquetas', description: 'Crear propuesta de logo con la "T" estilizada para los termos', status: 'completed', priority: 'medium', due_date: '2025-10-15', client_id: clientIds[1], assigned_to: montseId, created_by: adminId },
  { title: 'Seguimiento pago Qualitas', description: 'Llamar a Qualitas para confirmar fecha de pago pendiente $6,000', status: 'in_progress', priority: 'high', due_date: '2025-11-01', client_id: clientIds[6], assigned_to: montseId, created_by: adminId },
  { title: 'Entregar material promocional a Lumbreras GYM', description: 'Llevar los volantes y posters acordados', status: 'pending', priority: 'urgent', due_date: '2025-10-28', client_id: clientIds[4], assigned_to: albertoId, created_by: adminId },
  { title: 'Conseguir logo de Abstract Agencia', description: 'Pedir logo en formato .ai o .eps para diseño', status: 'pending', priority: 'medium', due_date: '2025-11-05', client_id: clientIds[10], assigned_to: alfredoId, created_by: adminId },
  { title: 'Cobrar a RAMZA Limpieza', description: 'Pendiente de pago $1,000 - llamar para recordatorio', status: 'pending', priority: 'high', due_date: '2025-10-30', client_id: clientIds[11], assigned_to: alfredoId, created_by: adminId },
  { title: 'Coordinar brunch con The Cake', description: 'Confirmar detalles del brunch para rueda de prensa', status: 'in_progress', priority: 'high', due_date: '2025-11-10', client_id: clientIds[23], assigned_to: adminId, created_by: adminId },
  { title: 'Enviar publicación redes - SAMCASE', description: 'Publicar agradecimiento en Instagram y Facebook', status: 'completed', priority: 'low', due_date: '2025-10-20', client_id: clientIds[8], assigned_to: ilseId, created_by: adminId },
  { title: 'Recoger material de Papelería Laredo', description: 'Pasar a recoger los kits de papelería donados', status: 'pending', priority: 'medium', due_date: '2025-11-08', client_id: clientIds[25], assigned_to: ilseId, created_by: adminId },
  { title: 'Preparar contrato LAPTSTORE', description: 'Redactar contrato de patrocinio y enviar para firma', status: 'pending', priority: 'urgent', due_date: '2025-10-25', client_id: clientIds[29], assigned_to: albertoId, created_by: adminId },
  { title: 'Agendar visita FarmaSoluciones', description: 'Confirmar fecha y hora para visita presencial', status: 'in_progress', priority: 'medium', due_date: '2025-11-02', client_id: clientIds[19], assigned_to: ixelId, created_by: adminId },
  { title: 'Solicitar diseño de playeras para Just Lu', description: 'Enviar brief a diseño para las 3 playeras personalizadas', status: 'pending', priority: 'medium', due_date: '2025-11-12', client_id: null, assigned_to: montseId, created_by: adminId },
  { title: 'Organizar ensayo de música BlueNote', description: 'Coordinar con la banda horario y espacio para prueba de sonido', status: 'pending', priority: 'low', due_date: '2025-11-15', client_id: clientIds[24], assigned_to: ilseId, created_by: adminId },
  { title: 'Revisar pagos pendientes del mes', description: 'Hacer corte de caja de todos los patrocinios del mes', status: 'in_progress', priority: 'high', due_date: '2025-10-31', client_id: null, assigned_to: adminId, created_by: adminId },
  { title: 'Enviar reconocimientos a conferencistas', description: 'Preparar y enviar los reconocimientos impresos', status: 'pending', priority: 'medium', due_date: '2025-11-18', client_id: null, assigned_to: montseId, created_by: adminId },
  { title: 'Confirmar toldos FEMA para Mercaday', description: 'Verificar medidas y cantidad de toldos para el evento', status: 'completed', priority: 'high', due_date: '2025-10-22', client_id: clientIds[26], assigned_to: ilseId, created_by: adminId },
  { title: 'Llamar a prospectos nuevos', description: 'Contactar a las empresas de la lista de espera', status: 'cancelled', priority: 'low', due_date: '2025-10-20', client_id: null, assigned_to: alfredoId, created_by: adminId },
];

const taskIds = tasks.map((t) => {
  const info = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, due_date, client_id, assigned_to, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(t.title, t.description, t.status, t.priority, t.due_date, t.client_id, t.assigned_to, t.created_by);
  return info.lastInsertRowid;
});

console.log(`  ✓ ${tasks.length} tareas creadas`);

// ── Comments ──
const comments = [
  { task_id: taskIds[0], user_id: adminId, comment: 'El diseño quedó excelente, al cliente le encantó.' },
  { task_id: taskIds[1], user_id: montseId, comment: 'Hablé con Qualitas, me dijeron que la próxima semana liberan el pago.' },
  { task_id: taskIds[1], user_id: adminId, comment: 'OK, dame follow-up el viernes.' },
  { task_id: taskIds[5], user_id: adminId, comment: 'Ya confirmé el brunch, serán 12 personas.' },
  { task_id: taskIds[5], user_id: montseId, comment: 'Perfecto, voy a coordinar con el lugar.' },
  { task_id: taskIds[8], user_id: albertoId, comment: 'El cliente quiere revisar el contrato antes de firmar.' },
  { task_id: taskIds[12], user_id: adminId, comment: 'Llevamos $45,000 recaudados, faltan $12,000 por cobrar.' },
];

for (const c of comments) {
  db.prepare('INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)').run(c.task_id, c.user_id, c.comment);
}

console.log(`  ✓ ${comments.length} comentarios creados`);

// ── Sample documents (text placeholders) ──
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __seedDir = dirname(fileURLToPath(import.meta.url));
const uploadDir = join(__seedDir, 'uploads');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const sampleDocs = [
  { client_idx: 0, original_name: 'Contrato_Patrocinio_KriKri.pdf', content: 'CONTRATO DE PATROCINIO - Kri Kri\n\nMonto: $3,000 en especie\nVigencia: Evento Timelines 2025' },
  { client_idx: 6, original_name: 'Factura_Qualitas.pdf', content: 'FACTURA - Qualitas\n\nConcepto: Patrocinio Legado ($6,000)\nEstatus: PENDIENTE DE PAGO' },
  { client_idx: 7, original_name: 'Logo_Control_de_Carga.png', content: '[Logo - Control de Carga]\nFormato: .ai\nRecibido: 15/10/2025' },
  { client_idx: 12, original_name: 'Cuponera_Jazmed.pdf', content: 'CUPONERA - Jazmed Decoración\n\n2 cupones de $1,000\n2 cupones de $500' },
  { client_idx: 17, original_name: 'Contrato_PEQUE_Clicks.pdf', content: 'CONTRATO DE PATROCINIO - PEQUE Clicks\n\nFotografía del evento + $2,500 efectivo' },
];

let docsCreated = 0;
for (const sd of sampleDocs) {
  const cid = clientIds[sd.client_idx];
  if (!cid) continue;
  const filename = `sample-${randomUUID()}.txt`;
  fs.writeFileSync(join(uploadDir, filename), sd.content);
  const isPublic = cid === clientIds[0] || cid === clientIds[17];
  db.prepare(`
    INSERT INTO documents (client_id, name, original_name, mime_type, size, uploaded_by, category, visibility)
    VALUES (?, ?, ?, 'text/plain', ?, ?, 'contrato', ?)
  `).run(cid, filename, sd.original_name, Buffer.byteLength(sd.content, 'utf-8'), adminId, isPublic ? 'public' : 'private');
  docsCreated++;
}

console.log(`  ✓ ${docsCreated} documentos de ejemplo creados`);
console.log('✅ Seed completado exitosamente');
console.log('');
console.log('Usuarios disponibles:');
console.log('  admin    / admin123  (Administrador)');
console.log('  montse   / 123456    (Montserrat Arévalo)');
console.log('  alberto  / 123456    (Alberto Lara)');
console.log(  '  invitado / 123456    (Invitado - solo vista)');
console.log('  krikri   / 123456    (Portal cliente - solo ve docs de Kri Kri)');
