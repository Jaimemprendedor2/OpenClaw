#!/bin/bash
if ! pgrep -f "openclaw gateway" > /dev/null; then
  echo "[$(date)] Bot down - Reiniciando..." >> ~/.openclaw/logs/healthcheck.log
  openclaw gateway start
fi
