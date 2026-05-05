#!/bin/sh
set -e
cd /app
if [ ! -d node_modules/next ]; then
  echo "docker-dev: installing dependencies (first run or empty node_modules volume)..."
  npm ci
fi
exec "$@"
