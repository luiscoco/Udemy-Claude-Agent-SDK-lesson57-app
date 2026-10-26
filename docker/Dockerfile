FROM node:24-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205
WORKDIR /probe
COPY probe.mjs ./probe.mjs
USER 1000:1000
CMD ["node","probe.mjs"]
