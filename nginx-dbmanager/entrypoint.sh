#!/bin/sh
# Generate htpasswd from environment variables and start Nginx

set -e

HTPASSWD_FILE="/etc/nginx/.htpasswd"
AUTH_USER="${NGINX_BASIC_AUTH_USER:-admin}"
AUTH_PASS="${NGINX_BASIC_AUTH_PASSWORD:-admin123}"

echo "============================================"
echo "  DB Manager - Nginx Reverse Proxy"
echo "============================================"
echo "  User: ${AUTH_USER}"
echo "  Backend: backup:8080"
echo "============================================"

# Generate htpasswd file
if [ -f /usr/bin/htpasswd ]; then
    # Alpine has htpasswd from httpd-tools
    htpasswd -bc "${HTPASSWD_FILE}" "${AUTH_USER}" "${AUTH_PASS}"
elif command -v python3 >/dev/null 2>&1; then
    # Fallback: use Python to generate htpasswd format
    python3 -c "
import hashlib, base64, os
salt = os.urandom(8)
h = hashlib.sha256(salt + b'${AUTH_PASS}').digest()
encoded = base64.b64encode(salt + h).decode()
with open('${HTPASSWD_FILE}', 'w') as f:
    f.write('${AUTH_USER}:{SSHA}' + encoded + '\n')
"
else
    # Last resort: use apr1-md5 via openssl (if available)
    echo "${AUTH_USER}:$(openssl passwd -apr1 '${AUTH_PASS}')" > "${HTPASSWD_FILE}"
fi

chmod 644 "${HTPASSWD_FILE}"
echo "[ENTRYPOINT] htpasswd file created for user: ${AUTH_USER}"

# Start Nginx
exec nginx -g "daemon off;"
