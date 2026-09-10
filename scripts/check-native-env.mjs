import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const files = ['.env', '.env.local', '.env.native', '.env.native.local']
const values = { ...process.env }

for (const name of files) {
  const path = resolve(root, name)
  if (!existsSync(path)) continue
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(VITE_[A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!match || values[match[1]]) continue
    values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
  }
}

const missing = [
  !values.VITE_SUPABASE_URL && 'VITE_SUPABASE_URL',
  !(values.VITE_SUPABASE_PUBLISHABLE_KEY || values.VITE_SUPABASE_ANON_KEY) && 'VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY)',
].filter(Boolean)

if (missing.length) {
  console.error(`Native build stopped: missing ${missing.join(', ')}. Add the values to .env.local or the build environment.`)
  process.exit(1)
}
