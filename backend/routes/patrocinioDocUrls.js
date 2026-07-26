import { Router } from 'express';
import db from '../database.js';
import { authMiddleware } from '../middleware/auth.js';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DOC_DIR = join(__dirname, '..', 'uploads', 'documents');
if (!fs.existsSync(DOC_DIR)) fs.mkdirSync(DOC_DIR, { recursive: true });

const ALLOWED_VARS = [
  'Nombre', 'Contacto', 'Telefono', 'Tipo', 'Paquete', 'Estatus',
  'EstadoVisita', 'EstadoPago', 'DetalleEspecie', 'DetallePago',
  'RedesSociales', 'Boletos', 'Logo', 'Notas', 'Fecha'
];

const VAR_MAP = {
  Nombre: 'company_name', Contacto: 'contact_person', Telefono: 'phone',
  Tipo: 'sponsorship_type', Paquete: 'package', Estatus: 'sponsor_status_name',
  EstadoVisita: 'visit_status', EstadoPago: 'payment_status',
  DetalleEspecie: 'in_kind_detail', DetallePago: 'payment_detail',
  RedesSociales: 'social_media_fulfilled', Boletos: 'tickets_delivered',
  Logo: 'logo_requested', Notas: 'notes'
};

function renderTemplate(template, patrocinio) {
  let html = template;
  for (const [varName, field] of Object.entries(VAR_MAP)) {
    const val = patrocinio[field] || '';
    html = html.replaceAll(`{{${varName}}}`, val);
  }
  html = html.replaceAll(/\{\{Fecha\}\}/g, new Date().toLocaleDateString('es-MX'));
  html = html.replaceAll(/\{\{[A-Za-z]+\}\}/g, '');
  return html;
}

const RICH_TEXT_ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'strong', 'em', 'u', 's', 'sub', 'sup',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img', 'a', 'span', 'div',
  'blockquote', 'pre', 'code'
];

const RICH_TEXT_ALLOWED_ATTRS = {
  'img': ['src', 'alt', 'width', 'height', 'style'],
  'a': ['href', 'target', 'rel'],
  'span': ['style'],
  'div': ['style'],
  'p': ['style'],
  'td': ['colspan', 'rowspan', 'style'],
  'th': ['colspan', 'rowspan', 'style'],
  'h1': ['style'], 'h2': ['style'], 'h3': ['style'],
  'h4': ['style'], 'h5': ['style'], 'h6': ['style'],
  'strong': ['style'], 'em': ['style'], 'u': ['style'],
  'ul': ['style'], 'ol': ['style'], 'li': ['style'],
  'blockquote': ['style'], 'pre': ['style'], 'code': ['style']
};

const RICH_TEXT_ALLOWED_STYLES = {
  '*': {
    'color': [/.*/],
    'background-color': [/.*/],
    'text-align': [/.*/],
    'font-size': [/.*/],
    'font-family': [/.*/],
    'text-decoration': [/.*/],
    'font-weight': [/.*/],
    'font-style': [/.*/],
    'margin': [/.*/],
    'padding': [/.*/],
    'border': [/.*/],
    'border-radius': [/.*/],
    'width': [/.*/],
    'height': [/.*/],
    'display': [/.*/],
    'line-height': [/.*/]
  }
};

function htmlToSafeHtml(input) {
  const isHtml = /<[a-z][\s\S]*>/i.test(input);
  if (isHtml) {
    return sanitizeHtml(input, {
      allowedTags: RICH_TEXT_ALLOWED_TAGS,
      allowedAttributes: RICH_TEXT_ALLOWED_ATTRS,
      allowedStyles: RICH_TEXT_ALLOWED_STYLES,
      allowedSchemes: ['http', 'https', 'mailto', 'data']
    });
  }
  const rawHtml = marked.parse(input);
  return sanitizeHtml(rawHtml, {
    allowedTags: RICH_TEXT_ALLOWED_TAGS,
    allowedAttributes: RICH_TEXT_ALLOWED_ATTRS,
    allowedStyles: RICH_TEXT_ALLOWED_STYLES,
    allowedSchemes: ['http', 'https', 'mailto', 'data']
  });
}

function stripDocTypeName(html, typeName) {
  if (!typeName) return html;
  const escaped = typeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^\\s*<(h[1-6]|p)[^>]*>\\s*${escaped}\\s*</\\1>\\s*`, 'i');
  return html.replace(re, '');
}

function wrapInDocument(bodyHtml, title) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${sanitizeHtml(title, { allowedTags: [] })}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1.5rem; color: #1a1a1a; line-height: 1.6; }
  h1 { font-size: 1.5rem; border-bottom: 2px solid #333; padding-bottom: .5rem; }
  h2 { font-size: 1.2rem; margin-top: 1.5rem; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  th, td { border: 1px solid #ccc; padding: .5rem .75rem; text-align: left; }
  th { background: #f5f5f5; }
  @media print { body { margin: 0; padding: 1rem; } }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

const router = Router();

router.get('/:patrocinioId', authMiddleware, (req, res) => {
  const rows = db.prepare(`
    SELECT pd.id, pd.url, pd.document_type_id, dt.name as document_type_name
    FROM patrocinio_doc_urls pd
    JOIN document_types dt ON pd.document_type_id = dt.id
    WHERE pd.patrocinio_id = ?
    ORDER BY dt.name
  `).all(req.params.patrocinioId);
  res.json(rows);
});

router.put('/:patrocinioId', authMiddleware, (req, res) => {
  const { urls } = req.body;
  if (!Array.isArray(urls)) return res.status(400).json({ error: 'urls debe ser un array' });

  const upsert = db.prepare(`
    INSERT INTO patrocinio_doc_urls (patrocinio_id, document_type_id, url, updated_at)
    VALUES (?, ?, ?, datetime('now','localtime'))
    ON CONFLICT(patrocinio_id, document_type_id) DO UPDATE SET
      url = excluded.url,
      updated_at = datetime('now','localtime')
  `);

  const upsertMany = db.transaction((items) => {
    for (const item of items) {
      if (item.document_type_id) {
        upsert.run(req.params.patrocinioId, item.document_type_id, item.url || null);
      }
    }
  });

  upsertMany(urls);
  res.json({ message: 'URLs actualizadas' });
});

router.post('/:patrocinioId/generate', authMiddleware, (req, res) => {
  const { document_type_id } = req.body;
  if (!document_type_id) return res.status(400).json({ error: 'document_type_id requerido' });

  const docType = db.prepare('SELECT * FROM document_types WHERE id = ?').get(document_type_id);
  if (!docType) return res.status(404).json({ error: 'Tipo de documento no encontrado' });
  if (!docType.template_body) return res.status(400).json({ error: 'Este tipo de documento no tiene plantilla' });

  const patrocinio = db.prepare('SELECT * FROM patrocinios WHERE id = ?').get(req.params.patrocinioId);
  if (!patrocinio) return res.status(404).json({ error: 'Patrocinio no encontrado' });

  const filled = renderTemplate(docType.template_body, patrocinio);
  const safeHtml = stripDocTypeName(htmlToSafeHtml(filled), docType.name);
  const fullHtml = wrapInDocument(safeHtml, docType.name);

  const filename = `${req.params.patrocinioId}_${document_type_id}.html`;
  const filePath = join(DOC_DIR, filename);
  fs.writeFileSync(filePath, fullHtml, 'utf-8');

  const relativeUrl = `/api/patrocinio-doc-urls/file/${filename}`;
  const upsert = db.prepare(`
    INSERT INTO patrocinio_doc_urls (patrocinio_id, document_type_id, url, updated_at)
    VALUES (?, ?, ?, datetime('now','localtime'))
    ON CONFLICT(patrocinio_id, document_type_id) DO UPDATE SET
      url = excluded.url,
      updated_at = datetime('now','localtime')
  `);
  upsert.run(req.params.patrocinioId, document_type_id, relativeUrl);

  res.json({ url: relativeUrl, html: fullHtml });
});

router.put('/:patrocinioId/regenerate', authMiddleware, (req, res) => {
  const { document_type_id, html } = req.body;
  if (!document_type_id || !html) return res.status(400).json({ error: 'document_type_id y html requeridos' });

  const patrocinio = db.prepare('SELECT id FROM patrocinios WHERE id = ?').get(req.params.patrocinioId);
  if (!patrocinio) return res.status(404).json({ error: 'Patrocinio no encontrado' });

  const safeHtml = htmlToSafeHtml(html);

  const fullHtml = wrapInDocument(safeHtml, 'Documento');

  const filename = `${req.params.patrocinioId}_${document_type_id}.html`;
  const filePath = join(DOC_DIR, filename);
  fs.writeFileSync(filePath, fullHtml, 'utf-8');

  const relativeUrl = `/api/patrocinio-doc-urls/file/${filename}`;
  db.prepare(`UPDATE patrocinio_doc_urls SET url = ?, updated_at = datetime('now','localtime') WHERE patrocinio_id = ? AND document_type_id = ?`)
    .run(relativeUrl, req.params.patrocinioId, document_type_id);

  res.json({ url: relativeUrl });
});

router.get('/file/:filename', (req, res) => {
  const safeName = req.params.filename.replace(/[^a-zA-Z0-9_.\-]/g, '');
  if (safeName !== req.params.filename) return res.status(400).json({ error: 'Nombre de archivo inválido' });
  const filePath = join(DOC_DIR, safeName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado' });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(filePath);
});

export default router;
