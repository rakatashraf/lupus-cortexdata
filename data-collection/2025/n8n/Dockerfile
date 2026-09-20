ARG N8N_VERSION=2.39.8
FROM docker.n8n.io/n8nio/n8n:${N8N_VERSION}
USER root
COPY workflow.json /opt/lupus-workflow/workflow.json
COPY entrypoint.sh /usr/local/bin/lupus-entrypoint.sh
RUN chmod 755 /usr/local/bin/lupus-entrypoint.sh
USER node
ENTRYPOINT ["tini", "--", "/usr/local/bin/lupus-entrypoint.sh"]
