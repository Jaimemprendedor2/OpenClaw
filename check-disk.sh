#!/bin/bash
USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$USAGE" -gt 80 ]; then
  echo "⚠️ Disco al ${USAGE}%"
  find ~/.openclaw/logs -mtime +30 -delete
fi
