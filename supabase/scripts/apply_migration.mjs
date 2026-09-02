/**
 * Aplica un archivo .sql a Supabase via exec_sql RPC.
 * Divide el SQL en statements individuales respetando bloques $$.
 * Uso: node supabase/scripts/apply_migration.mjs <path/al/archivo.sql>
 */
import { supabase } from './_supabase.mjs'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const file = process.argv[2]
if (!file) { console.error('Uso: node supabase/scripts/apply_migration.mjs <archivo.sql>'); process.exit(1) }

const sql = readFileSync(resolve(file), 'utf8')

// ── Splitter que respeta $$ y comentarios SQL ────────────────────────
// Estados: NORMAL, LINE_COMMENT, BLOCK_COMMENT, DOLLAR_QUOTE, SINGLE_QUOTE
function splitStatements(sql) {
  const stmts = []
  let buf = ''
  let state = 'NORMAL'
  let i = 0

  while (i < sql.length) {
    const ch = sql[i]
    const ch2 = sql[i + 1]

    if (state === 'NORMAL') {
      if (ch === '-' && ch2 === '-') {
        // Inicio comentario de línea
        state = 'LINE_COMMENT'
        buf += ch; i++; continue
      }
      if (ch === '/' && ch2 === '*') {
        state = 'BLOCK_COMMENT'
        buf += ch; i++; continue
      }
      if (ch === '$' && ch2 === '$') {
        state = 'DOLLAR_QUOTE'
        buf += '$$'; i += 2; continue
      }
      if (ch === "'") {
        state = 'SINGLE_QUOTE'
        buf += ch; i++; continue
      }
      if (ch === ';') {
        buf += ';'
        const stmt = buf.trim()
        // Solo guardar si hay SQL real (no solo comentarios)
        const code = stmt
          .replace(/--[^\n]*/g, '')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .trim()
        if (code) stmts.push(stmt)
        buf = ''
        i++; continue
      }
      buf += ch; i++; continue
    }

    if (state === 'LINE_COMMENT') {
      buf += ch
      if (ch === '\n') state = 'NORMAL'
      i++; continue
    }

    if (state === 'BLOCK_COMMENT') {
      buf += ch
      if (ch === '*' && ch2 === '/') {
        buf += ch2; i += 2; state = 'NORMAL'; continue
      }
      i++; continue
    }

    if (state === 'DOLLAR_QUOTE') {
      if (ch === '$' && ch2 === '$') {
        buf += '$$'; i += 2; state = 'NORMAL'; continue
      }
      buf += ch; i++; continue
    }

    if (state === 'SINGLE_QUOTE') {
      buf += ch
      if (ch === "'" && ch2 === "'") { buf += ch2; i += 2; continue } // escaped quote
      if (ch === "'") { state = 'NORMAL' }
      i++; continue
    }

    buf += ch; i++
  }

  // Residuo final
  const remainder = buf.trim()
  if (remainder) {
    const code = remainder.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim()
    if (code) stmts.push(remainder)
  }

  return stmts
}

async function execSQL(query) {
  const { data, error } = await supabase.rpc('exec_sql', { query })
  if (error) throw Object.assign(new Error(error.message), { detail: error })
  return data
}

// ── Ejecutar ──────────────────────────────────────────────────────
const statements = splitStatements(sql)
console.log(`\n📄 Archivo: ${file}`)
console.log(`📦 Statements detectados: ${statements.length}\n`)

let ok = 0
let failed = 0

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i]
  // Etiqueta corta para el log
  const preview = stmt.replace(/\s+/g, ' ').trim().slice(0, 80)
  process.stdout.write(`  [${i + 1}/${statements.length}] ${preview}… `)

  try {
    await execSQL(stmt)
    console.log('✓')
    ok++
  } catch (err) {
    console.log(`✗\n    ERROR: ${err.message}`)
    if (err.detail?.hint) console.log(`    HINT: ${err.detail.hint}`)
    failed++
    // Continuar en errores de "ya existe" (idempotencia)
    const msg = (err.message ?? '').toLowerCase()
    if (
      msg.includes('already exists') ||
      msg.includes('duplicate') ||
      msg.includes('ya existe')
    ) {
      console.log('    (ignorado — idempotente)')
      ok++
      failed--
      continue
    }
    console.error('\n💥 Migración abortada.')
    process.exit(1)
  }
}

console.log(`\n✅ Migración completada: ${ok} OK, ${failed} errores\n`)
