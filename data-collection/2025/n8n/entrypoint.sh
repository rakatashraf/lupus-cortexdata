#!/bin/sh
set -eu
MARKER=/home/node/.n8n/.lupus_2025_v2_imported
if [ ! -f "$MARKER" ]; then
  if n8n import:workflow --input=/opt/lupus-workflow/workflow.json; then
    touch "$MARKER"
  else
    echo 'Workflow import failed; n8n will start. Create your owner account and import n8n/workflow.json from the editor.' >&2
  fi
fi
exec n8n start
