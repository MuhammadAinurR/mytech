#!/usr/bin/env bash
# Deploys origin/main to the VPS: pull, install, migrate, build, reload PM2.
# Run from your machine after merging to main: ./deploy/deploy.sh
set -euo pipefail

HOST=${DEPLOY_HOST:-ktech}
URL=https://startup.rofiq.id

ssh "$HOST" 'bash -s' <<'REMOTE'
set -euo pipefail
cd ~/apps/rofiq/mytech
git pull --ff-only
echo "Deploying $(git log --oneline -1)"

# Build and run on the Node version in .nvmrc, installed next to the others
# with nvm. nvm's default keeps resolving to the version it does now, so
# other apps and shells keep their Node (and their global tools, like pm2).
export NVM_DIR="$HOME/.nvm"
NODE_VERSION=$(cat .nvmrc)
NODE_BIN="$NVM_DIR/versions/node/v$NODE_VERSION/bin"
if [ ! -x "$NODE_BIN/node" ]; then
  set +eu # nvm.sh isn't written for strict mode
  . "$NVM_DIR/nvm.sh"
  default=$(nvm version default)
  nvm install "$NODE_VERSION" >/dev/null
  nvm alias default "$default" >/dev/null
  set -eu
fi
export PATH="$NODE_BIN:$PATH"
# PM2 is installed under the Node the shared daemon runs on, not this one.
PM2=$(ls "$NVM_DIR"/versions/node/*/bin/pm2 | head -1)
echo "Node $(node -v), PM2 from $PM2"

npm ci --no-audit --no-fund
npm run db:migrate
npm run build
"$PM2" startOrReload deploy/ecosystem.config.cjs --update-env
"$PM2" save
sleep 5
curl -fsS http://127.0.0.1:3110/api/health
echo
REMOTE

curl -fsS -o /dev/null -w "$URL → %{http_code}\n" "$URL/api/health"
