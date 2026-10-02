# QloB (Quemen los Barcos) — Instrucciones

App de finanzas personales: React 18 + TypeScript + Vite + Tailwind + Supabase, desplegada en Vercel.

> **Importante:** el proyecto Supabase **ya existe** y contiene tus datos reales.
> **No crees un proyecto nuevo ni ejecutes scripts SQL para "empezar de cero".**
> Si cambiaste de computador o lo reiniciaste, sigue "Reconectar" y consulta `RECUPERACION.md`.

## 1. Instalar dependencias

Requiere Node.js 18 o superior (https://nodejs.org) y Git.

```bash
npm install
```

## 2. Reconectar a Supabase (proyecto existente)

Crea `.env.local` en la raíz del proyecto con estas variables. Los valores se obtienen en
Supabase → *Project Settings → API*. **No los escribas en documentos ni los subas a Git.**

```
VITE_SUPABASE_URL=            (URL del proyecto existente)
VITE_SUPABASE_ANON_KEY=       (clave pública)
SUPABASE_PROJECT_ID=          (ref del proyecto; para los scripts)
SUPABASE_SERVICE_ROLE_KEY=    (solo para scripts locales de respaldo; nunca en Vercel)
```

Para ejecutar la app solo hacen falta las dos primeras.

Comprobación: al iniciar sesión deben aparecer tus cuentas y movimientos. Si aparece vacío, **detente**
y revisa que la URL sea la del proyecto original; no ejecutes SQL.

## 3. Ejecutar en desarrollo

```bash
npm run dev
```

Abre http://localhost:5173

## 4. Comprobaciones

```bash
npx tsc --noEmit     # tipos
npm test             # pruebas
npm run build        # build de producción
```

## 5. Respaldos

```bash
node supabase/scripts/backup.mjs
```

Guarda una copia de solo lectura en `C:\Respaldos\QloB\AAAA-MM-DD\` con manifiesto y verificación.
Detalles de qué se respalda, cómo verificar y cómo restaurar: **`RECUPERACION.md`**.

## 6. Qué NO hacer

- No ejecutar `supabase/035_reset_total.sql` ni `supabase/scripts/limpiar_datos_usuario.sql` (borran datos).
- No ejecutar scripts SQL contra producción sin revisarlos y sin aprobación.
- No poner `SUPABASE_SERVICE_ROLE_KEY` en Vercel, en variables `VITE_*` ni en Git.
- No crear datos de prueba en la base real.

## 7. Despliegue

Vercel despliega al subir cambios a `main` en GitHub (`VacioVon/finanzas-vacio`).
Variables en Vercel: solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
