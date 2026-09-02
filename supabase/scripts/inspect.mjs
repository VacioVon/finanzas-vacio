/**
 * Inspecciona el estado de la base de datos:
 * tablas, columnas, policies RLS, functions, triggers.
 * Uso: node supabase/scripts/inspect.mjs [tabla]
 */
import { supabase, SUPABASE_URL, SERVICE_KEY } from './_supabase.mjs'

const target = process.argv[2]

async function rest(sql) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
  })
  // Use supabase client with rpc if available, else direct fetch
  const { data, error } = await supabase.rpc('exec_sql', { query: sql }).maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

async function query(sql) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ query: sql })
  })
  if (!r.ok) {
    const txt = await r.text()
    throw new Error(`HTTP ${r.status}: ${txt}`)
  }
  return r.json()
}

// Listar tablas
const tables = await supabase
  .from('information_schema.tables')
  .select('table_name, table_type')
  .eq('table_schema', 'public')
  .order('table_name')

if (tables.error) {
  // Fallback con API directa
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Accept: 'application/json' } }
  )
  const definitions = await r.json()
  const names = Object.keys(definitions?.definitions ?? definitions ?? {})
  console.log('\n📋 TABLAS DISPONIBLES:')
  names.forEach(n => console.log(' •', n))
  process.exit(0)
}

if (target) {
  console.log(`\n📋 COLUMNAS DE: ${target}`)
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable, column_default')
    .eq('table_schema', 'public')
    .eq('table_name', target)
    .order('ordinal_position')

  if (error) { console.error(error.message); process.exit(1) }
  data?.forEach(c => {
    const nullable = c.is_nullable === 'YES' ? '?' : '!'
    const def = c.column_default ? ` = ${c.column_default}` : ''
    console.log(` ${nullable} ${c.column_name.padEnd(30)} ${c.data_type}${def}`)
  })
} else {
  console.log('\n📋 TABLAS EN SCHEMA PUBLIC:')
  const { data } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_type', 'BASE TABLE')
    .order('table_name')
  data?.forEach(t => console.log(' •', t.table_name))
  console.log(`\nTotal: ${data?.length ?? 0} tablas`)
  console.log('\nPara ver columnas: node supabase/scripts/inspect.mjs <tabla>')
}
