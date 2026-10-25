const { readdirSync } = require('node:fs')
const { spawnSync } = require('node:child_process')
const { resolve, delimiter } = require('node:path')
const root = resolve(__dirname, '..')
const env = { ...process.env, NODE_PATH: [resolve(root, 'node_modules'), resolve(root, 'packages/shared/node_modules'), process.env.NODE_PATH].filter(Boolean).join(delimiter) }
for (const file of readdirSync(resolve(root, 'tests')).filter(file => file.endsWith('.cjs')).sort()) {
  const result = spawnSync(process.execPath, [resolve(root, 'tests', file)], { cwd: root, env, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status || 1)
}
