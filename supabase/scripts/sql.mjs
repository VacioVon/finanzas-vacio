/**
 * Ejecuta SQL arbitrario contra el proyecto via REST API.
 * Uso: node supabase/scripts/sql.mjs "SELECT count(*) FROM movimientos"
 */
import { SUPABASE_URL, SERVICE_KEY } from './_supabase.mjs'

const query = process.argv.slice(2).join(' ')
if (!query) { console.error('Uso: node supabase/scripts/sql.mjs "<SQL>"'); process.exit(1) }

const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query })
})

if (!res.ok) {
  // Fallback: pg endpoint directo
  const res2 = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  })
  const txt = await res2.text()
  try { console.log(JSON.stringify(JSON.parse(txt), null, 2)) }
  catch { console.log(txt) }
  process.exit(res2.ok ? 0 : 1)
}

const data = await res.json()
console.log(JSON.stringify(data, null, 2))
