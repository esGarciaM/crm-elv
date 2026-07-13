#!/bin/sh
# Entrypoint for the backup container
# Sets up cron for automatic backups and starts sqlite-web

set -e

DB_SOURCE="${DB_SOURCE:-/app/data/crm.db}"
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
BACKUP_INTERVAL="${BACKUP_INTERVAL:-60}"
WEB_PORT="${WEB_PORT:-8080}"

echo "============================================"
echo "  CRM Database Backup & Manager"
echo "============================================"
echo "  Database:     $DB_SOURCE"
echo "  Backup dir:   $BACKUP_DIR"
echo "  Interval:     every ${BACKUP_INTERVAL} minutes"
echo "  Retention:    ${BACKUP_RETENTION:-30} backups"
echo "  Web UI:       http://0.0.0.0:${WEB_PORT}"
echo "  Timezone:     ${TZ:-UTC}"
echo "============================================"

# Wait for the database file to exist (backend might still be starting)
echo "[ENTRYPOINT] Waiting for database..."
WAIT_COUNT=0
MAX_WAIT=60
while [ ! -f "$DB_SOURCE" ]; do
    WAIT_COUNT=$((WAIT_COUNT + 1))
    if [ "$WAIT_COUNT" -ge "$MAX_WAIT" ]; then
        echo "[ENTRYPOINT] WARNING: Database not found after ${MAX_WAIT}s. Starting anyway..."
        break
    fi
    sleep 1
done

if [ -f "$DB_SOURCE" ]; then
    echo "[ENTRYPOINT] Database found: $DB_SOURCE"
fi

# Run an initial backup on startup
echo "[ENTRYPOINT] Running initial backup..."
sh /app/backup.sh || echo "[ENTRYPOINT] Initial backup failed, will retry on schedule."

# Setup crontab for scheduled backups
echo "[ENTRYPOINT] Setting up cron (every ${BACKUP_INTERVAL} minutes)..."
echo "*/${BACKUP_INTERVAL} * * * * sh /app/backup.sh >> /var/log/cron/backup.log 2>&1" > /etc/crontabs/root

# Ensure log directory exists and set permissions
mkdir -p /var/log/cron
touch /var/log/cron/backup.log

# Start crond in background
crond -f -l 2 &
CRON_PID=$!
echo "[ENTRYPOINT] Cron started (PID: $CRON_PID)"

# Start sqlite-web in foreground
# -d: database file path
# -p: port
# --url-prefix: URL prefix for the web app
echo "[ENTRYPOINT] Starting sqlite-web on port ${WEB_PORT}..."
exec sqlite_web \
    "$DB_SOURCE" \
    --host 0.0.0.0 \
    --port "$WEB_PORT" \
    --no-browser \
    2>&1
