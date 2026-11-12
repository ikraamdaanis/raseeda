FROM node:22-bookworm

# Install system dependencies (unzip is required by the bun installer)
RUN apt-get update && apt-get install -y \
  git \
  curl \
  jq \
  unzip \
  && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
  | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && apt-get update && apt-get install -y gh \
  && rm -rf /var/lib/apt/lists/*

# System libraries for Playwright's Chromium and WebKit (the e2e suite runs
# both). Keep the version in step with @playwright/test in package.json.
RUN npx -y playwright@1.64.0 install-deps chromium webkit \
  && rm -rf /var/lib/apt/lists/*

# Build-args for UID/GID alignment: sandcastle docker build-image
# defaults these to the host user's UID/GID so image-built files
# and bind-mounted files share an owner without runtime chown.
ARG AGENT_UID=1000
ARG AGENT_GID=1000

# Rename the base image's "node" user to "agent" and align UID/GID.
# If AGENT_GID already exists in the base image (macOS hosts use GID 20,
# which collides with Debian's "dialout" group), reuse it instead of
# renaming node's group, which would fail.
RUN if ! getent group "$AGENT_GID" > /dev/null; then groupmod -g "$AGENT_GID" node; fi \
  && usermod -u "$AGENT_UID" -g "$AGENT_GID" -d /home/agent -m -l agent node
USER ${AGENT_UID}:${AGENT_GID}

# Install Claude Code CLI and bun (main.mts runs `bun install` as its setup hook)
RUN curl -fsSL https://claude.ai/install.sh | bash
RUN curl -fsSL https://bun.sh/install | bash

# The browsers themselves, in the agent's cache, so each sandbox starts with
# them rather than downloading them per issue.
RUN npx -y playwright@1.64.0 install chromium webkit

# Add Claude and bun to PATH
ENV PATH="/home/agent/.bun/bin:/home/agent/.local/bin:$PATH"

WORKDIR /home/agent

# In worktree sandbox mode, Sandcastle bind-mounts the git worktree at /home/agent/workspace
# and overrides the working directory to /home/agent/workspace at container start.
# Structure your Dockerfile so that /home/agent/workspace can serve as the project root.
ENTRYPOINT ["sleep", "infinity"]
