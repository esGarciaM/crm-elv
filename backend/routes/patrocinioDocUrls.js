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
  'RedesSociales', 'Boletos', 'Logo', 'Notas', 'Fecha', 'Folio'
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
  html = html.replaceAll(/\{\{Folio\}\}/g, 'FOLIO-' + String(patrocinio.id).padStart(4, '0'));
  html = html.replaceAll(/\{\{[A-Za-z]+\}\}/g, '');
  return html;
}

const RICH_TEXT_ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'strong', 'em', 'u', 's', 'sub', 'sup',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img', 'a', 'span', 'div', 'hr',
  'blockquote', 'pre', 'code'
];

const RICH_TEXT_ALLOWED_ATTRS = {
  '*': ['class'],
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

function flattenPrintPages(html) {
  const openRe = /<div\b[^>]*class=["'][^"']*\bprint-page\b[^"']*["'][^>]*>/gi;
  if (!openRe.test(html)) return html;
  openRe.lastIndex = 0;

  const divRe = /<div\b[^>]*>|<\/div>/gi;
  const isWrapper = /class=["'][^"']*\bprint-page\b[^"']*["']/i;

  const root = [];
  const stack = [];
  let textBuf = '';
  let last = 0;

  const flush = () => {
    if (textBuf) {
      const target = stack.length ? stack[stack.length - 1].chunks : root;
      target.push(textBuf);
      textBuf = '';
    }
  };

  let m;
  while ((m = divRe.exec(html)) !== null) {
    const token = m[0];
    if (token[1] !== '/') {
      textBuf += html.slice(last, m.index);
      flush();
      stack.push({ isWrapper: isWrapper.test(token), openTag: token, chunks: [] });
    } else {
      textBuf += html.slice(last, m.index);
      flush();
      const open = stack.pop();
      if (!open) continue;
      const content = open.chunks.join('');
      const rebuilt = open.isWrapper ? content : (open.openTag + content + token);
      if (stack.length) {
        stack[stack.length - 1].chunks.push(rebuilt);
        if (open.isWrapper) stack[stack.length - 1].chunks.push('<hr class="page-break">');
      } else {
        root.push(rebuilt);
        if (open.isWrapper) root.push('<hr class="page-break">');
      }
    }
    last = m.index + token.length;
  }
  textBuf += html.slice(last);
  flush();

  return root.join('').replace(/(<hr class="page-break">)+$/i, '');
}

function splitIntoPages(bodyHtml) {
  const flattened = flattenPrintPages(bodyHtml);
  const parts = flattened.split(/<hr[^>]*class=["'][^"']*page-break[^"']*["'][^>]*>/gi);
  return parts.map(p => p.trim()).filter(Boolean);
}

function wrapInDocument(bodyHtml, title, watermarkUrl) {
  const pages = splitIntoPages(bodyHtml).map(p => `<div class="print-page">${p}</div>`).join('\n') || bodyHtml;

  const watermarkBg = watermarkUrl ? `#fff url('${watermarkUrl}') center / cover no-repeat` : '#fff';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${sanitizeHtml(title, { allowedTags: [] })}</title>
<style>
  * { box-sizing: border-box; }
  @page { size: A4; margin: 8.9mm 6.3mm; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    background: #eef0f2;
    margin: 0;
    /* padding: 1.5rem; */
    color: #1a1a1a;
    /* line-height: 1.6; */
  }
  .print-page {
    width: 21cm;
    min-height: 29.6cm;
    margin: 0 auto 1.5rem;
    padding: 4cm 3cm;
    background: ${watermarkBg};
    box-shadow: 0 1px 6px rgba(0,0,0,.15);
    word-wrap: break-word;
  }
  h1 { font-size: 1.5rem; border-bottom: 2px solid #333; padding-bottom: .5rem; }
  h2 { font-size: 1.2rem; margin-top: 1.5rem; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  th, td { border: 1px solid #ccc; padding: .5rem .75rem; text-align: left; }
  th { background: #f5f5f5; }
  hr.page-break { border: none; margin: 0; }
  @media print {
    body { background: none; padding: 0; }
    .print-page {
      width: auto;
      min-height: 27.8cm;
      margin: 0;
      padding: 4cm 3cm;
      box-shadow: none;
      background: ${watermarkBg};
      page-break-after: always;
      break-after: page;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-page:last-child { page-break-after: auto; break-after: auto; }
    hr.page-break { display: none; }
  }
</style>
</head>
<body>
${pages}
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
  const fullHtml = wrapInDocument(safeHtml, docType.name, docType.watermark_url);

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

  const docType = db.prepare('SELECT watermark_url FROM document_types WHERE id = ?').get(document_type_id);

  const cleaned = html
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<div\s+class="watermark"[^>]*>.*?<\/div>/gis, '');
  const safeHtml = htmlToSafeHtml(cleaned);

  const fullHtml = wrapInDocument(safeHtml, docType ? docType.name || 'Documento' : 'Documento', docType?.watermark_url);

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
