#!/bin/sh
# SQLite Backup Script
# Uses SQLite's online backup API for safe, consistent backups
# even while the database is being actively used.

set -e

DB_SOURCE="${DB_SOURCE:-/app/data/crm.db}"
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
BACKUP_RETENTION="${BACKUP_RETENTION:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/crm_backup_${TIMESTAMP}.db"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Check if source database exists
if [ ! -f "$DB_SOURCE" ]; then
    echo "[BACKUP] ERROR: Database not found at $DB_SOURCE"
    exit 1
fi

# Check if source database is accessible
if [ ! -r "$DB_SOURCE" ]; then
    echo "[BACKUP] ERROR: Database not readable at $DB_SOURCE"
    exit 1
fi

# Get database size before backup
DB_SIZE=$(du -h "$DB_SOURCE" | cut -f1)
echo "[BACKUP] Starting backup of $DB_SOURCE ($DB_SIZE)..."

# Method: Use sqlite3 .backup command for safe online backup
# This is equivalent to SQLite's backup API and is safe to run
# while the database is being written to by the application.
if command -v sqlite3 >/dev/null 2>&1; then
    # sqlite3 is available - use it for backup
    if sqlite3 "$DB_SOURCE" ".backup '${BACKUP_FILE}'"; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo "[BACKUP] Success: $BACKUP_FILE ($BACKUP_SIZE)"
    else
        echo "[BACKUP] ERROR: sqlite3 backup failed"
        rm -f "$BACKUP_FILE"
        exit 1
    fi
else
    # Fallback: use Python's sqlite3 module
    python3 -c "
import sqlite3
import sys
try:
    src = sqlite3.connect('${DB_SOURCE}')
    dst = sqlite3.connect('${BACKUP_FILE}')
    with dst:
        src.backup(dst)
    src.close()
    dst.close()
    print('[BACKUP] Success via Python sqlite3 backup API')
except Exception as e:
    print(f'[BACKUP] ERROR: {e}', file=sys.stderr)
    sys.exit(1)
"
    if [ $? -ne 0 ]; then
        echo "[BACKUP] ERROR: Python backup failed"
        rm -f "$BACKUP_FILE"
        exit 1
    fi
fi

# Verify the backup file is a valid SQLite database
if ! sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
    echo "[BACKUP] WARNING: Backup integrity check did not return 'ok'"
fi

# Rotate old backups - keep only the most recent N backups
BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/crm_backup_*.db 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$BACKUP_RETENTION" ]; then
    FILES_TO_DELETE=$((BACKUP_COUNT - BACKUP_RETENTION))
    echo "[BACKUP] Rotating: removing $FILES_TO_DELETE old backup(s) (keeping $BACKUP_RETENTION)..."
    ls -1t "${BACKUP_DIR}"/crm_backup_*.db | tail -n "$FILES_TO_DELETE" | while read -r OLD_FILE; do
        echo "[BACKUP]   Deleting: $(basename "$OLD_FILE")"
        rm -f "$OLD_FILE"
    done
fi

# Summary
TOTAL_BACKUPS=$(ls -1 "${BACKUP_DIR}"/crm_backup_*.db 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
echo "[BACKUP] Done. Total backups: $TOTAL_BACKUPS | Total size: $TOTAL_SIZE"
