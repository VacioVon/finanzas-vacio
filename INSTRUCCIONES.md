# Finanzas Vacío — Instrucciones Sprint 1

## 1. Instalar dependencias

Requiere Node.js 18+. Instálalo desde https://nodejs.org

```bash
npm install
```

## 2. Configurar Supabase

### 2.1 Crear proyecto
1. Ve a https://supabase.com → New Project
2. Nombre: `finanzas-vacio`
3. Región: South America (São Paulo)

### 2.2 Ejecutar SQL
En Supabase → SQL Editor, ejecutar en orden:
1. `supabase/migrations/001_initial_schema.sql` — crea tablas, RLS, funciones
2. `supabase/seed.sql` — carga categorías y subcategorías por defecto

### 2.3 Variables de entorno
Copia las credenciales desde Supabase → Project Settings → API y edita `.env.local`:

```
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY_AQUI
```

### 2.4 Configurar Auth
En Supabase → Authentication → Providers:
- Email: habilitado ✓
- Confirm email: puedes desactivarlo para pruebas locales

## 3. Ejecutar en desarrollo

```bash
npm run dev
```

Abre http://localhost:5173

## 4. Build para producción

```bash
npm run build
npm run preview
```

## Estructura Sprint 1

| Módulo | Estado | Ruta |
|---|---|---|
| Autenticación | ✅ | /login, /register |
| Home | ✅ | / |
| Movimientos | ✅ | /movimientos |
| Cuentas | ✅ | /cuentas (desde /mas) |
| Categorías | ✅ | /categorias (desde /mas) |
| Presupuestos | ⏳ Sprint 2 | — |
| Ahorros | ⏳ Sprint 2 | — |
| Deudas | ⏳ Sprint 3 | — |
| Calendario | ⏳ Sprint 3 | — |
| Análisis | ⏳ Sprint 4 | — |
| Ajustes | ⏳ Sprint 4 | — |
