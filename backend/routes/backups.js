import { Router } from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { readdir, stat, unlink, copyFile, access } from 'fs/promises';
import { join, basename } from 'path';
import { execSync } from 'child_process';

const router = Router();
const BACKUP_DIR = process.env.BACKUP_DIR || '/app/backups';
const DB_PATH = process.env.DB_PATH || '/app/data/crm.db';

// Helper: safe backup using Python sqlite3 (available in backend container)
function createDbBackup(src, dst) {
  execSync(
    `python3 -c "
import sqlite3, sys
try:
    src = sqlite3.connect('${src}')
    dst = sqlite3.connect('${dst}')
    with dst:
        src.backup(dst)
    src.close()
    dst.close()
except Exception as e:
    print(str(e), file=sys.stderr)
    sys.exit(1)
"`,
    { timeout: 30000, stdio: 'pipe' }
  );
}

// Helper: verify DB integrity
function checkIntegrity(dbPath) {
  const result = execSync(
    `python3 -c "
import sqlite3
db = sqlite3.connect('${dbPath}')
result = db.execute('PRAGMA integrity_check').fetchone()
db.close()
print(result[0])
"`,
    { encoding: 'utf8', timeout: 10000 }
  ).trim();
  return result;
}

// List all backups
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const files = await readdir(BACKUP_DIR);
    const backups = [];

    for (const file of files) {
      if (!file.startsWith('crm_backup_') || !file.endsWith('.db')) continue;
      const filePath = join(BACKUP_DIR, file);
      const fileStat = await stat(filePath);

      // Parse filename: crm_backup_YYYYMMDD_HHMMSS.db
      const match = file.match(/crm_backup_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\.db/);
      let date = fileStat.mtime;
      if (match) {
        const [_, y, m, d, h, min, s] = match;
        date = new Date(`${y}-${m}-${d}T${h}:${min}:${s}`);
      }

      backups.push({
        filename: file,
        date: date.toISOString(),
        size: fileStat.size,
        sizeHuman: formatBytes(fileStat.size),
      });
    }

    // Sort newest first
    backups.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Current DB info
    let currentDb = null;
    try {
      const dbStat = await stat(DB_PATH);
      currentDb = {
        size: dbStat.size,
        sizeHuman: formatBytes(dbStat.size),
        modified: dbStat.mtime.toISOString(),
      };
    } catch { }

    res.json({ backups, currentDb, backupDir: BACKUP_DIR });
  } catch (error) {
    res.status(500).json({ error: 'Error al listar backups: ' + error.message });
  }
});

// Download a backup
router.get('/:filename/download', authMiddleware, adminOnly, async (req, res) => {
  const { filename } = req.params;

  // Validate filename to prevent path traversal
  if (!filename.match(/^crm_backup_\d{8}_\d{6}\.db$/)) {
    return res.status(400).json({ error: 'Nombre de archivo inválido' });
  }

  const filePath = join(BACKUP_DIR, filename);
  try {
    await access(filePath);
    res.download(filePath, filename);
  } catch {
    res.status(404).json({ error: 'Backup no encontrado' });
  }
});

// Create a manual backup
router.post('/create', authMiddleware, adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const backupFile = join(BACKUP_DIR, `crm_backup_${timestamp}.db`);

    createDbBackup(DB_PATH, backupFile);

    const fileStat = await stat(backupFile);
    res.json({
      success: true,
      message: 'Backup creado exitosamente',
      file: {
        filename: basename(backupFile),
        date: now.toISOString(),
        size: fileStat.size,
        sizeHuman: formatBytes(fileStat.size),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear backup: ' + error.message });
  }
});

// Restore a backup
router.post('/:filename/restore', authMiddleware, adminOnly, async (req, res) => {
  const { filename } = req.params;

  // Validate filename
  if (!filename.match(/^crm_backup_\d{8}_\d{6}\.db$/)) {
    return res.status(400).json({ error: 'Nombre de archivo inválido' });
  }

  const backupPath = join(BACKUP_DIR, filename);

  try {
    // Check backup exists
    await access(backupPath);

    // Create safety backup of current DB before restore
    const safetyNow = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const safetyTimestamp = `${safetyNow.getFullYear()}${pad(safetyNow.getMonth()+1)}${pad(safetyNow.getDate())}_${pad(safetyNow.getHours())}${pad(safetyNow.getMinutes())}${pad(safetyNow.getSeconds())}`;
    const safetyFile = join(BACKUP_DIR, `crm_pre_restore_${safetyTimestamp}.db`);
    await copyFile(DB_PATH, safetyFile);

    // Verify backup integrity before restoring
    const integrity = checkIntegrity(backupPath);

    if (integrity !== 'ok') {
      return res.status(400).json({ error: 'El backup no pasa la verificación de integridad' });
    }

    // Restore: copy backup over current DB
    await copyFile(backupPath, DB_PATH);

    res.json({
      success: true,
      message: `Base de datos restaurada desde ${filename}. Safety backup guardado como ${basename(safetyFile)}`,
      safetyBackup: basename(safetyFile),
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al restaurar backup: ' + error.message });
  }
});

// Delete a backup
router.delete('/:filename', authMiddleware, adminOnly, async (req, res) => {
  const { filename } = req.params;

  // Validate filename - allow pre_restore backups too
  if (!filename.match(/^crm_(backup|pre_restore)_\d{8}_\d{6}\.db$/)) {
    return res.status(400).json({ error: 'Nombre de archivo inválido' });
  }

  const filePath = join(BACKUP_DIR, filename);
  try {
    await access(filePath);
    await unlink(filePath);
    res.json({ success: true, message: 'Backup eliminado' });
  } catch {
    res.status(404).json({ error: 'Backup no encontrado' });
  }
});

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default router;
