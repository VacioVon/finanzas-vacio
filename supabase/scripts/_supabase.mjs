import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '../../.env.local')

const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const URL  = env.VITE_SUPABASE_URL
const KEY  = env.SUPABASE_SERVICE_ROLE_KEY
const ID   = env.SUPABASE_PROJECT_ID

if (!URL || !KEY) throw new Error('Faltan vars en .env.local')

export const supabase = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

export const PROJECT_ID = ID
export const SUPABASE_URL = URL
export const SERVICE_KEY = KEY
