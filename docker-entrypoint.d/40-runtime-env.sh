#!/bin/sh
set -eu

cat >/usr/share/nginx/html/config.js <<EOF
window.__APP_CONFIG__ = {
  VITE_API_BASE_URL: "${VITE_API_BASE_URL:-}",
  VITE_CAPCUT_API_BASE_URL: "${VITE_CAPCUT_API_BASE_URL:-}",
  VITE_CAPCUT_API_KEY: "${VITE_CAPCUT_API_KEY:-}"
};
EOF

chmod 644 /usr/share/nginx/html/config.js
