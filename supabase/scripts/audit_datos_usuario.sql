-- ============================================================
-- QUEMEN LOS BARCOS — Auditoría de datos (solo lectura)
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- IMPORTANTE: Son 10 consultas SELECT separadas.
-- Pégalas y ejecútalas UNA POR UNA para ver cada resultado.
-- No hace ningún cambio en la base de datos.
-- ============================================================


-- ══════════════════════════════════════════════════════════
-- CONSULTA 1 — Identificar usuario
-- Pegar y ejecutar esta consulta primero.
-- ══════════════════════════════════════════════════════════

SELECT
  p.id          AS usuario_id,
  p.nombre,
  au.email,
  p.moneda,
  p.fecha_sueldo,
  p.tema,
  p.created_at  AS registro
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
ORDER BY p.created_at;


-- ══════════════════════════════════════════════════════════
-- CONSULTA 2 — Conteo de registros por tabla
-- Muestra cuántos registros tiene cada tabla para tu usuario.
-- ══════════════════════════════════════════════════════════

WITH uid AS (
  SELECT id FROM public.profiles LIMIT 1
)
SELECT tabla, cantidad, tipo_dato FROM (
  SELECT 'movimientos'        AS tabla, COUNT(*) AS cantidad, 'transaccional' AS tipo_dato FROM public.movimientos       WHERE usuario_id = (SELECT id FROM uid)
  UNION ALL
  SELECT 'cuotas_credito',    COUNT(*), 'transaccional' FROM public.cuotas_credito    WHERE usuario_id = (SELECT id FROM uid)
  UNION ALL
  SELECT 'aportes_objetivos', COUNT(*), 'transaccional' FROM public.aportes_objetivos WHERE usuario_id = (SELECT id FROM uid)
  UNION ALL
  SELECT 'presupuestos',      COUNT(*), 'transaccional' FROM public.presupuestos      WHERE usuario_id = (SELECT id FROM uid)
  UNION ALL
  SELECT 'suscripciones',     COUNT(*), 'transaccional' FROM public.suscripciones     WHERE usuario_id = (SELECT id FROM uid)
  UNION ALL
  SELECT 'deudas',            COUNT(*), 'transaccional' FROM public.deudas            WHERE usuario_id = (SELECT id FROM uid)
  UNION ALL
  SELECT 'objetivos_ahorro',  COUNT(*), 'transaccional' FROM public.objetivos_ahorro  WHERE usuario_id = (SELECT id FROM uid)
  UNION ALL
  SELECT 'eventos_calendario',COUNT(*), 'transaccional' FROM public.eventos_calendario WHERE usuario_id = (SELECT id FROM uid)
  UNION ALL
  SELECT 'salud_financiera',  COUNT(*), 'tabla sin uso' FROM public.salud_financiera  WHERE usuario_id = (SELECT id FROM uid)
  UNION ALL
  SELECT 'cuentas',           COUNT(*), 'configuracion' FROM public.cuentas           WHERE usuario_id = (SELECT id FROM uid)
  UNION ALL
  SELECT 'categorias_propias',COUNT(*), 'configuracion' FROM public.categorias        WHERE usuario_id = (SELECT id FROM uid) AND es_default = FALSE
  UNION ALL
  SELECT 'subcats_propias',   COUNT(*), 'configuracion' FROM public.subcategorias     WHERE usuario_id = (SELECT id FROM uid)
  UNION ALL
  SELECT 'categorias_base',   COUNT(*), 'sistema'       FROM public.categorias        WHERE es_default = TRUE
  UNION ALL
  SELECT 'profiles',          COUNT(*), 'sistema'       FROM public.profiles          WHERE id = (SELECT id FROM uid)
) AS resumen
ORDER BY
  CASE tipo_dato
    WHEN 'transaccional' THEN 1
    WHEN 'configuracion' THEN 2
    WHEN 'sistema'       THEN 3
    ELSE 4
  END,
  tabla;


-- ══════════════════════════════════════════════════════════
-- CONSULTA 3 — Detalle de cuentas y tarjetas
-- ══════════════════════════════════════════════════════════

SELECT
  id,
  nombre,
  tipo,
  institucion,
  saldo_inicial,
  saldo_actual,
  limite,
  activa,
  created_at
FROM public.cuentas
WHERE usuario_id = (SELECT id FROM public.profiles LIMIT 1)
ORDER BY tipo, nombre;


-- ══════════════════════════════════════════════════════════
-- CONSULTA 4 — Movimientos (los 50 más recientes)
-- ══════════════════════════════════════════════════════════

SELECT
  m.id,
  m.fecha,
  m.tipo,
  m.monto,
  c.nombre        AS cuenta,
  cat.nombre      AS categoria,
  sub.nombre      AS subcategoria,
  m.nota,
  m.para_tercero,
  m.tercero_nombre,
  m.comision,
  CASE WHEN m.comprobante_url IS NOT NULL THEN 'Sí' ELSE 'No' END AS tiene_comprobante,
  m.created_at
FROM public.movimientos m
LEFT JOIN public.cuentas      c   ON c.id   = m.cuenta_id
LEFT JOIN public.categorias   cat ON cat.id = m.categoria_id
LEFT JOIN public.subcategorias sub ON sub.id = m.subcategoria_id
WHERE m.usuario_id = (SELECT id FROM public.profiles LIMIT 1)
ORDER BY m.fecha DESC, m.created_at DESC
LIMIT 50;


-- ══════════════════════════════════════════════════════════
-- CONSULTA 5 — Deudas
-- ══════════════════════════════════════════════════════════

SELECT
  d.id,
  d.nombre,
  d.monto_total,
  d.monto_pendiente,
  d.cuotas_total,
  d.cuotas_pagadas,
  d.cuota_mensual,
  d.interes,
  d.fecha_compra,
  d.fecha_prox_pago,
  d.estado,
  c.nombre AS cuenta_asociada,
  d.nota
FROM public.deudas d
LEFT JOIN public.cuentas c ON c.id = d.cuenta_id
WHERE d.usuario_id = (SELECT id FROM public.profiles LIMIT 1)
ORDER BY d.estado, d.fecha_prox_pago;


-- ══════════════════════════════════════════════════════════
-- CONSULTA 6 — Cuotas de crédito
-- ══════════════════════════════════════════════════════════

SELECT
  cc.id,
  cc.nombre,
  cc.emoji,
  cc.monto_total,
  cc.monto_cuota,
  cc.cuotas_total,
  cc.cuotas_pagadas,
  cc.cuotas_total - cc.cuotas_pagadas AS cuotas_restantes,
  cc.interes,
  cc.comision,
  cc.para_tercero,
  cc.tercero_nombre,
  cc.fecha_inicio,
  cc.estado,
  c.nombre AS tarjeta
FROM public.cuotas_credito cc
LEFT JOIN public.cuentas c ON c.id = cc.cuenta_id
WHERE cc.usuario_id = (SELECT id FROM public.profiles LIMIT 1)
ORDER BY cc.estado, cc.fecha_inicio DESC;


-- ══════════════════════════════════════════════════════════
-- CONSULTA 7 — Objetivos de ahorro y sus aportes
-- ══════════════════════════════════════════════════════════

SELECT
  o.id,
  o.nombre,
  o.emoji,
  o.monto_objetivo,
  o.monto_actual,
  ROUND((o.monto_actual::numeric / NULLIF(o.monto_objetivo, 0)) * 100, 1) AS porcentaje,
  o.fecha_objetivo,
  o.estado,
  (SELECT COUNT(*) FROM public.aportes_objetivos a WHERE a.objetivo_id = o.id) AS num_aportes,
  (SELECT SUM(monto) FROM public.aportes_objetivos a WHERE a.objetivo_id = o.id AND monto > 0) AS total_aportado,
  o.created_at
FROM public.objetivos_ahorro o
WHERE o.usuario_id = (SELECT id FROM public.profiles LIMIT 1)
ORDER BY o.estado, o.created_at;


-- ══════════════════════════════════════════════════════════
-- CONSULTA 8 — Suscripciones
-- ══════════════════════════════════════════════════════════

SELECT
  s.id,
  s.nombre,
  s.emoji,
  s.monto,
  s.frecuencia,
  s.dia_cobro,
  s.proxima_fecha,
  s.activa,
  c.nombre   AS cuenta_asociada,
  cat.nombre AS categoria,
  sub.nombre AS subcategoria,
  s.nota
FROM public.suscripciones s
LEFT JOIN public.cuentas       c   ON c.id   = s.cuenta_id
LEFT JOIN public.categorias    cat ON cat.id = s.categoria_id
LEFT JOIN public.subcategorias sub ON sub.id = s.subcategoria_id
WHERE s.usuario_id = (SELECT id FROM public.profiles LIMIT 1)
ORDER BY s.activa DESC, s.proxima_fecha;


-- ══════════════════════════════════════════════════════════
-- CONSULTA 9 — Categorías: propias vs. sistema
-- ══════════════════════════════════════════════════════════

SELECT
  id,
  nombre,
  tipo,
  emoji,
  color,
  es_default,
  CASE
    WHEN usuario_id IS NULL AND es_default = TRUE THEN 'Sistema (base)'
    WHEN usuario_id IS NOT NULL AND es_default = FALSE THEN 'Tuya (personalizada)'
    ELSE 'Otro'
  END AS origen,
  activa,
  (
    SELECT COUNT(*)
    FROM public.subcategorias sc
    WHERE sc.categoria_id = categorias.id
  ) AS num_subcategorias
FROM public.categorias
ORDER BY
  CASE WHEN es_default THEN 0 ELSE 1 END,
  tipo, nombre;


-- ══════════════════════════════════════════════════════════
-- CONSULTA 10 — Archivos en Storage
-- ══════════════════════════════════════════════════════════

SELECT
  bucket_id,
  name      AS archivo,
  (metadata->>'size')::bigint AS bytes,
  ROUND((metadata->>'size')::numeric / 1024, 1) AS kb,
  created_at
FROM storage.objects
WHERE bucket_id IN ('comprobantes', 'avatars')
ORDER BY bucket_id, created_at DESC;
