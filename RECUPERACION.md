# QloB — Respaldo y recuperación

> Este documento **no contiene claves ni contraseñas**. Solo nombres de variables.
> Última revisión: 2026-10-01 (Fase 0).

## Idea central

QloB se compone de tres piezas independientes. Si se pierde una, las otras siguen intactas:

| Pieza | Dónde vive | Si se pierde el computador… |
|---|---|---|
| Código | GitHub: `VacioVon/finanzas-vacio` | Se clona de nuevo |
| Datos y archivos | Proyecto Supabase existente (`SUPABASE_PROJECT_ID`) | **Siguen en la nube; no hay que crear nada** |
| Sitio publicado | Vercel (conectado al repositorio) | Sigue funcionando |

**Un reinicio o pérdida del computador NO es motivo para crear un Supabase nuevo.**
Solo se reconecta el código al proyecto existente (sección A).

---

## A. Reconectar el proyecto a Supabase existente

1. Instalar Node.js 18 o superior y Git.
2. Clonar el código (sección B) y entrar a la carpeta.
3. `npm install`
4. Crear el archivo `.env.local` en la raíz con estas variables (los valores se obtienen en
   Supabase → *Project Settings → API*; **no** se escriben en documentos ni se suben a Git):

   | Variable | Para qué sirve | Obligatoria |
   |---|---|---|
   | `VITE_SUPABASE_URL` | URL del proyecto existente | Sí |
   | `VITE_SUPABASE_ANON_KEY` | Clave pública que usa la app (protegida por reglas RLS) | Sí |
   | `SUPABASE_PROJECT_ID` | Identificador (ref) del proyecto | Para los scripts |
   | `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio: acceso total. **Solo scripts locales** (respaldo). Nunca en Vercel, nunca con prefijo `VITE_`, nunca en Git | Solo para respaldos |

5. `npm run dev` e iniciar sesión con tu cuenta habitual.
6. **Comprobar que es el backend correcto:** deben aparecer tus cuentas, movimientos y deudas.
   Si aparece vacío o no reconoce tu cuenta, **detente** y no ejecutes ningún script SQL: revisa
   que la URL corresponda al proyecto original.

## B. Recuperar el código desde GitHub

```bash
git clone https://github.com/VacioVon/finanzas-vacio.git
cd finanzas-vacio
npm install
```

Si falta algo reciente que aún no se subió, cada respaldo incluye `codigo/repositorio.bundle`
(repositorio Git completo): `git clone codigo/repositorio.bundle recuperado`.

Git pedirá iniciar sesión en GitHub la primera vez (Git Credential Manager abre el navegador).

## C. Dónde están los respaldos

`C:\Respaldos\QloB\AAAA-MM-DD\` (fuera de OneDrive y fuera del repositorio).

```
manifiesto.json          fecha, proyecto, filas por tabla, tamaños, checksums, estado
datos/<tabla>.json       una tabla por archivo (32 tablas)
auth_usuarios.json       usuarios de autenticación (sin contraseñas)
storage/<bucket>/...     archivos de los buckets (comprobantes, avatars)
codigo/                  repositorio.bundle, scripts SQL, package.json, documentación
config/                  variables_de_entorno.txt  (NOMBRE=CONFIGURADA, sin valores)
```

Los respaldos contienen **datos financieros personales**: guárdalos comprimidos con contraseña
si salen de tu computador, y mantén una segunda copia en otro disco.

Frecuencia recomendada: **antes de cada cambio grande** y **una vez por semana**.
Conservar las últimas 8 copias semanales y todas las previas a cambios importantes.

Crear un respaldo (solo lectura, no modifica nada en Supabase):

```bash
node supabase/scripts/backup.mjs            # respaldo completo
node supabase/scripts/backup.mjs --dry-run  # solo muestra qué respaldaría
```

## D. Cómo verificar un respaldo

El propio script verifica y termina en **ESTADO: OK** o **ERROR**. Para revisarlo a mano:

1. Abrir `manifiesto.json`: `estado` debe ser `OK`, `verificacion.tablas_ok` igual a `tablas_total`,
   `checksums_ok: true` y `secretos_expuestos: false`.
2. Cada tabla trae `filas_respaldo` y `filas_base_viva`; deben ser iguales.
3. `totales_control` (suma de saldos, de montos de movimientos y de deudas) debe coincidir con lo
   que muestra la app en ese momento.
4. Si algún conteo no coincide, el script se detiene (código de salida 2) y **no corrige nada**:
   se revisa la causa antes de usar ese respaldo.

La prueba de que un respaldo realmente sirve es **restaurarlo en un proyecto de prueba** (sección E).
Esa prueba aún no se ha hecho.

## E. Cómo restaurar datos (documentado, aún no probado)

> **Requiere aprobación manual explícita.** Nunca se restaura sobre el proyecto de producción
> sin revisar antes qué datos existen y cuáles se perderían o duplicarían.

Principios:
- Restaurar primero en un **proyecto Supabase temporal y vacío**, comparar y recién entonces decidir.
- Las tablas se cargan en el orden de `manifiesto.json → orden_restauracion` (primero las tablas de las
  que otras dependen, por ejemplo `profiles` y `cuentas` antes que `movimientos`).
- Se carga con la clave de servicio, solo con inserciones; nunca borrando tablas existentes.
- `auth_usuarios.json` guarda id y correo, **no las contraseñas**. Al recrear usuarios hay que conservar
  el mismo `id` (las tablas lo referencian) y la persona fija una contraseña nueva.
- Los archivos de `storage/` se vuelven a subir a los mismos buckets con la misma ruta.
- Este respaldo **no incluye el esquema** (tablas, funciones, reglas RLS): ver "Pendiente" más abajo.
  Para un proyecto completamente nuevo, el esquema debe existir antes de cargar datos.

Verificación posterior: comparar conteos por tabla con `manifiesto.json` y revisar saldos en la app.

## F. Qué pasos requieren aprobación manual

- Cualquier restauración (siempre).
- Cualquier script SQL contra producción (`supabase/*.sql`, `supabase/scripts/apply*.mjs`, `sql.mjs`).
- Crear un proyecto Supabase nuevo.
- Cambiar variables de entorno en Vercel o el proyecto Supabase al que apunta la app.
- Subir cambios a GitHub (`git push`).

## G. Secretos necesarios

| Secreto | Dónde se guarda | Nunca en |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Gestor de contraseñas + `.env.local` | Git, Vercel, `VITE_*`, respaldos, documentos |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` y variables de Vercel | Documentos |
| Contraseña de la base de datos | Gestor de contraseñas (solo si se hace volcado del esquema) | Git, `.env.local` |
| Acceso a GitHub | Git Credential Manager | Documentos |

Protegido por `.gitignore`: `.env`, `.env.*` (excepto `.env.example`), `.env.local`, `supabase/.temp/`,
`Respaldos/`, `respaldos/`, `backups/`.

## H. Qué NO hacer

- **No ejecutar nunca** `supabase/035_reset_total.sql`, `supabase/scripts/limpiar_datos_usuario.sql` ni
  ningún script que borre datos. Son destructivos y no forman parte de ningún flujo automático.
- No ejecutar `supabase db reset`, `DROP`, `TRUNCATE` ni `DELETE` masivos contra producción.
- No crear un Supabase nuevo si el existente sigue disponible.
- No poner la clave de servicio en Vercel, en el código del navegador ni en un archivo versionado.
- No restaurar sobre producción sin revisión.
- No insertar datos de prueba en la base real.

## Pendiente (no resuelto todavía)

1. **Esquema real de la base (capa C).** Las migraciones del repositorio no son una copia fiel: varios
   arreglos (035–046) se aplicaron a mano. Un volcado completo del esquema necesita la contraseña de la base
   y las herramientas `supabase` o `pg_dump`, que no están instaladas. Se decidirá si es necesario.
2. **Prueba real de restauración** en un proyecto Supabase temporal y separado.
3. **Revisar el plan de Supabase** (Project Settings → Billing / Database → Backups): el plan gratuito no
   incluye respaldos automáticos propios.
4. Existen **2 usuarios** en la base; confirmar que ambos son esperados.
