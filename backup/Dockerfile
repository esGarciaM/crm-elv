FROM python:3.12-alpine

RUN apk add --no-cache sqlite busybox-suid wget

# Install sqlite-web (web-based SQLite database manager)
RUN pip install --no-cache-dir sqlite-web

# Create directories
RUN mkdir -p /app/backups /app/data /var/log/cron

# Copy scripts
COPY backup.sh /app/backup.sh
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/backup.sh /app/entrypoint.sh

# Default environment variables
ENV DB_SOURCE=/app/data/crm.db \
    BACKUP_DIR=/app/backups \
    BACKUP_INTERVAL=480 \
    BACKUP_RETENTION=30 \
    WEB_PORT=8080 \
    TZ=America/Mexico_City

EXPOSE 8080

VOLUME ["/app/backups"]

ENTRYPOINT ["/app/entrypoint.sh"]
