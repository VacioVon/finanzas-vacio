-- ============================================================
-- SEED: Categorías y subcategorías por defecto
-- Ejecutar DESPUÉS de 001_initial_schema.sql
-- ============================================================

-- ─── CATEGORÍAS DE GASTO ─────────────────────────────────────
WITH cats AS (
  INSERT INTO public.categorias (nombre, tipo, emoji, color, activa, es_default, orden)
  VALUES
    ('Alimentación',      'gasto', '🛒', '#16A34A', TRUE, TRUE, 1),
    ('Transporte',        'gasto', '🚌', '#0891B2', TRUE, TRUE, 2),
    ('Vehículo',          'gasto', '🚗', '#D97706', TRUE, TRUE, 3),
    ('Hogar',             'gasto', '🏠', '#7C3AED', TRUE, TRUE, 4),
    ('Salud',             'gasto', '💊', '#DC2626', TRUE, TRUE, 5),
    ('Entretenimiento',   'gasto', '🎬', '#DB2777', TRUE, TRUE, 6),
    ('Educación',         'gasto', '📚', '#2563EB', TRUE, TRUE, 7),
    ('Ropa',              'gasto', '👕', '#9333EA', TRUE, TRUE, 8),
    ('Servicios',         'gasto', '💡', '#EA580C', TRUE, TRUE, 9),
    ('Compras',           'gasto', '🛍️', '#0F766E', TRUE, TRUE, 10),
    ('Aplicaciones',      'gasto', '📱', '#4338CA', TRUE, TRUE, 11),
    ('Pareja',            'gasto', '❤️', '#E11D48', TRUE, TRUE, 12),
    ('Mascotas',          'gasto', '🐾', '#854D0E', TRUE, TRUE, 13),
    ('Gastos Financieros','gasto', '🏦', '#374151', TRUE, TRUE, 14)
  RETURNING id, nombre
)
-- ─── SUBCATEGORÍAS DE GASTO ──────────────────────────────────
INSERT INTO public.subcategorias (categoria_id, nombre, activa, es_default, orden)
SELECT c.id, s.nombre, TRUE, TRUE, s.orden
FROM cats c
JOIN (VALUES
  -- Alimentación
  ('Alimentación', 'Supermercado', 1),
  ('Alimentación', 'Restaurantes', 2),
  ('Alimentación', 'Comida Rápida', 3),
  ('Alimentación', 'Cafeterías', 4),
  ('Alimentación', 'Delivery', 5),
  ('Alimentación', 'Feria', 6),
  -- Transporte
  ('Transporte', 'Transporte Público', 1),
  ('Transporte', 'Taxi', 2),
  ('Transporte', 'Uber', 3),
  ('Transporte', 'Transporte General', 4),
  -- Vehículo
  ('Vehículo', 'Combustible', 1),
  ('Vehículo', 'Estacionamiento', 2),
  ('Vehículo', 'Peajes', 3),
  ('Vehículo', 'Mantenimiento', 4),
  ('Vehículo', 'Seguro', 5),
  ('Vehículo', 'Impuestos', 6),
  ('Vehículo', 'Repuestos', 7),
  -- Hogar
  ('Hogar', 'Arriendo', 1),
  ('Hogar', 'Hipoteca', 2),
  ('Hogar', 'Muebles', 3),
  ('Hogar', 'Electrodomésticos', 4),
  ('Hogar', 'Decoración', 5),
  ('Hogar', 'Reparaciones', 6),
  -- Salud
  ('Salud', 'Consultas Médicas', 1),
  ('Salud', 'Medicamentos', 2),
  ('Salud', 'Exámenes', 3),
  ('Salud', 'Odontología', 4),
  ('Salud', 'Seguro Médico', 5),
  -- Entretenimiento
  ('Entretenimiento', 'Cine', 1),
  ('Entretenimiento', 'Videojuegos', 2),
  ('Entretenimiento', 'Salidas', 3),
  ('Entretenimiento', 'Eventos', 4),
  ('Entretenimiento', 'Streaming', 5),
  -- Educación
  ('Educación', 'Matrícula', 1),
  ('Educación', 'Cursos', 2),
  ('Educación', 'Libros', 3),
  ('Educación', 'Material Escolar', 4),
  ('Educación', 'Certificaciones', 5),
  ('Educación', 'Mensualidad', 6),
  -- Ropa
  ('Ropa', 'Ropa Casual', 1),
  ('Ropa', 'Calzado', 2),
  ('Ropa', 'Accesorios', 3),
  ('Ropa', 'Ropa Deportiva', 4),
  ('Ropa', 'Ropa Formal', 5),
  -- Servicios
  ('Servicios', 'Electricidad', 1),
  ('Servicios', 'Agua', 2),
  ('Servicios', 'Gas', 3),
  ('Servicios', 'Internet', 4),
  ('Servicios', 'Telefonía Móvil', 5),
  -- Compras
  ('Compras', 'Tecnología', 1),
  ('Compras', 'Hogar', 2),
  ('Compras', 'Compras Online', 3),
  ('Compras', 'Artículos Personales', 4),
  -- Aplicaciones
  ('Aplicaciones', 'Netflix', 1),
  ('Aplicaciones', 'Spotify', 2),
  ('Aplicaciones', 'ChatGPT', 3),
  ('Aplicaciones', 'Claude', 4),
  ('Aplicaciones', 'Microsoft 365', 5),
  ('Aplicaciones', 'Google One', 6),
  ('Aplicaciones', 'Disney+', 7),
  ('Aplicaciones', 'HBO Max', 8),
  -- Pareja
  ('Pareja', 'Citas', 1),
  ('Pareja', 'Regalos', 2),
  ('Pareja', 'Viajes', 3),
  ('Pareja', 'Celebraciones', 4),
  ('Pareja', 'Apoyo Económico', 5),
  ('Pareja', 'Salir a Comer', 6),
  -- Mascotas
  ('Mascotas', 'Alimento', 1),
  ('Mascotas', 'Arena', 2),
  ('Mascotas', 'Juguetes', 3),
  ('Mascotas', 'Veterinario', 4),
  ('Mascotas', 'Medicamentos', 5),
  ('Mascotas', 'Accesorios', 6),
  -- Gastos Financieros
  ('Gastos Financieros', 'Comisiones Bancarias', 1),
  ('Gastos Financieros', 'Intereses', 2),
  ('Gastos Financieros', 'Cuotas de Manejo', 3),
  ('Gastos Financieros', 'Impuestos Financieros', 4),
  ('Gastos Financieros', 'Impuesto Internacional', 5)
) AS s(cat_nombre, nombre, orden) ON c.nombre = s.cat_nombre;

-- ─── CATEGORÍAS DE INGRESO ───────────────────────────────────
WITH cats_ingreso AS (
  INSERT INTO public.categorias (nombre, tipo, emoji, color, activa, es_default, orden)
  VALUES
    ('Sueldo',      'ingreso', '💼', '#16A34A', TRUE, TRUE, 1),
    ('Extra',       'ingreso', '💰', '#2563EB', TRUE, TRUE, 2),
    ('Beca',        'ingreso', '🎓', '#7C3AED', TRUE, TRUE, 3),
    ('Inversiones', 'ingreso', '📈', '#D97706', TRUE, TRUE, 4)
  RETURNING id, nombre
)
INSERT INTO public.subcategorias (categoria_id, nombre, activa, es_default, orden)
SELECT c.id, s.nombre, TRUE, TRUE, s.orden
FROM cats_ingreso c
JOIN (VALUES
  ('Sueldo', 'Salario Base', 1),
  ('Sueldo', 'Horas Extras', 2),
  ('Sueldo', 'Bonificaciones', 3),
  ('Sueldo', 'Comisiones', 4),
  ('Extra', 'Regalos Recibidos', 1),
  ('Extra', 'Ventas Ocasionales', 2),
  ('Extra', 'Reembolsos', 3),
  ('Extra', 'Premios', 4),
  ('Beca', 'Subsidios Educativos', 1),
  ('Beca', 'Auxilios', 2),
  ('Beca', 'Incentivos Académicos', 3),
  ('Beca', 'Apoyos Gubernamentales', 4),
  ('Inversiones', 'Dividendos', 1),
  ('Inversiones', 'Rentabilidad Fondo', 2),
  ('Inversiones', 'Venta de Activos', 3)
) AS s(cat_nombre, nombre, orden) ON c.nombre = s.cat_nombre;

-- ─── CATEGORÍA DE AHORRO ─────────────────────────────────────
WITH cat_ahorro AS (
  INSERT INTO public.categorias (nombre, tipo, emoji, color, activa, es_default, orden)
  VALUES ('Ahorros', 'ahorro', '🏦', '#2563EB', TRUE, TRUE, 1)
  RETURNING id, nombre
)
INSERT INTO public.subcategorias (categoria_id, nombre, activa, es_default, orden)
SELECT c.id, s.nombre, TRUE, TRUE, s.orden
FROM cat_ahorro c
JOIN (VALUES
  ('Ahorros', 'Fondo Emergencia', 1),
  ('Ahorros', 'Auto', 2),
  ('Ahorros', 'Vacaciones', 3),
  ('Ahorros', 'Casa', 4),
  ('Ahorros', 'Estudios', 5),
  ('Ahorros', 'Matrimonio', 6)
) AS s(cat_nombre, nombre, orden) ON c.nombre = s.cat_nombre;

-- ─── CATEGORÍA DE INVERSIÓN ──────────────────────────────────
WITH cat_inv AS (
  INSERT INTO public.categorias (nombre, tipo, emoji, color, activa, es_default, orden)
  VALUES ('Inversiones', 'inversion', '📈', '#D97706', TRUE, TRUE, 1)
  RETURNING id, nombre
)
INSERT INTO public.subcategorias (categoria_id, nombre, activa, es_default, orden)
SELECT c.id, s.nombre, TRUE, TRUE, s.orden
FROM cat_inv c
JOIN (VALUES
  ('Inversiones', 'Fondos Mutuos', 1),
  ('Inversiones', 'Acciones', 2),
  ('Inversiones', 'ETF', 3),
  ('Inversiones', 'Depósitos a Plazo', 4)
) AS s(cat_nombre, nombre, orden) ON c.nombre = s.cat_nombre;
