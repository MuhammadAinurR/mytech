// PM2 processes for the VPS deployment at https://startup.rofiq.id (see deploy/README.md).
const path = require('node:path')

const root = path.resolve(__dirname, '..')

module.exports = {
  apps: [
    {
      name: 'mytech-web',
      cwd: root,
      script: 'node_modules/next/dist/bin/next',
      // Loopback only: nginx terminates TLS and proxies to this port.
      args: 'start -H 127.0.0.1 -p 3110',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '700M',
      kill_timeout: 10_000,
    },
    {
      name: 'mytech-worker',
      cwd: root,
      script: 'node_modules/tsx/dist/cli.mjs',
      args: '--conditions=react-server src/worker/index.ts',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '400M',
      // The worker closes BullMQ on SIGINT; give a running job time to finish.
      kill_timeout: 30_000,
    },
  ],
}
