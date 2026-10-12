# syntax=docker/dockerfile:1
# Debian bookworm supplies glibc >= 2.35 for the pinned CRE CLI binary.
FROM node:22.13.0-bookworm-slim AS runner-base
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl unzip tini \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/wysiwys
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./tsconfig.base.json
COPY packages/ ./packages/
COPY services/runner/ ./services/runner/
COPY workflow/package.json ./workflow/package.json
# Workspace metadata is required by npm ci; frontend source and dependencies are not installed here.
COPY app/package.json ./app/package.json
RUN npm ci --ignore-scripts --workspace=packages/shared --workspace=packages/decoder --workspace=services/runner --include-workspace-root \
    && npm run build --workspace=packages/decoder \
    && npm cache clean --force
COPY deployments/devnet.json ./deployments/devnet.json
COPY deploy/railway/entrypoint.mjs ./deploy/railway/entrypoint.mjs
COPY deploy/railway/runtime-env.mjs ./deploy/railway/runtime-env.mjs
COPY deploy/railway/check-connectivity.mjs ./deploy/railway/check-connectivity.mjs
ENV NODE_ENV=production RUNNER_DB_PATH=/data/runner.db
EXPOSE 8787
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "deploy/railway/entrypoint.mjs"]

# Lower runtime overhead when a deployed CRE workflow is available.
FROM runner-base AS live

# Default image also supports the existing local simulation and mock forwarder path.
FROM runner-base AS simulation
ARG CRE_VERSION=1.35.0
ARG CRE_SHA256=fbf3dbc5685d273c78c0ff70f950dc1bca9877323a4970fcffb4d41f3329e3bb
ARG BUN_VERSION=1.3.5
RUN curl -fsSL "https://github.com/smartcontractkit/cre-cli/releases/download/v${CRE_VERSION}/cre_linux_amd64_ldd2-35.tar.gz" -o /tmp/cre.tar.gz \
    && echo "${CRE_SHA256}  /tmp/cre.tar.gz" | sha256sum -c - \
    && mkdir /tmp/cre-unpack && tar -xzf /tmp/cre.tar.gz -C /tmp/cre-unpack \
    && find /tmp/cre-unpack -type f -name 'cre*' -exec install -m 0755 {} /usr/local/bin/cre \; \
    && cre version \
    && rm -rf /tmp/cre.tar.gz /tmp/cre-unpack
RUN curl -fsSL "https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-x64.zip" -o /tmp/bun.zip \
    && unzip -q /tmp/bun.zip -d /tmp/bun-unpack \
    && install -m 0755 /tmp/bun-unpack/bun-linux-x64/bun /usr/local/bin/bun \
    && rm -rf /tmp/bun.zip /tmp/bun-unpack
COPY workflow/confidential-preflight/project.yaml ./workflow/confidential-preflight/project.yaml
COPY workflow/confidential-preflight/review-secrets.yaml ./workflow/confidential-preflight/review-secrets.yaml
COPY workflow/confidential-preflight/review/ ./workflow/confidential-preflight/review/
RUN cd workflow/confidential-preflight/review && bun install --frozen-lockfile
ENV CRE_BIN=/usr/local/bin/cre CRE_PROJECT_DIR=/opt/wysiwys/workflow/confidential-preflight \
    CRE_WORKFLOW=review CRE_TARGET=staging-settings CRE_BROADCAST=true
