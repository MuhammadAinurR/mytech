#!/usr/bin/env bash
# Deploys origin/main to the VPS: pull, install, migrate, build, reload PM2.
# Run from your machine after merging to main: ./deploy/deploy.sh
set -euo pipefail

HOST=${DEPLOY_HOST:-ktech}
URL=https://startup.rofiq.id

ssh "$HOST" 'bash -s' <<'REMOTE'
set -euo pipefail
# PM2 and Node come from nvm, which non-interactive ssh doesn't load.
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
cd ~/apps/rofiq/mytech

git pull --ff-only
echo "Deploying $(git log --oneline -1)"
npm ci --no-audit --no-fund
npm run db:migrate
npm run build
pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 save
sleep 5
curl -fsS http://127.0.0.1:3110/api/health
echo
REMOTE

curl -fsS -o /dev/null -w "$URL → %{http_code}\n" "$URL/api/health"
