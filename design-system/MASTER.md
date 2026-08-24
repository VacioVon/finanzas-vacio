# QloB Design System — MASTER

> Fuente de verdad. Todo componente nuevo debe adherirse a estas reglas antes de mergear.

---

## Paleta de superficies (dark-first)

| Token | Hex | Uso |
|-------|-----|-----|
| `night-0` | `#1A1822` | Fondo de app, página base |
| `night-1` | `#23212C` | Modales, sheets, sidebar |
| `night-2` | `#2C2A38` | Cards elevadas |
| `night-3` | `#353344` | Inputs, estados interactivos, badges neutros |
| `night-border` | `#3D3B50` | Bordes, divisores |

**Opacidades permitidas sobre superficies:** `/60` (bordes sutiles), `/40` (divisores de sección), `/15` o `/10` (overlays hover).

---

## Paleta semántica financiera

| Token | Hex | Uso |
|-------|-----|-----|
| `brand` | `#2979FF` | Acciones primarias, nav activo, FAB |
| `gasto` | `#F4645F` | Gastos, errores, eliminar |
| `ingreso` | `#10D97F` | Ingresos, éxito, confirmaciones |
| `ahorro` | `#9B5DE5` | Ahorros, objetivos |
| `mover` | `#00C2CB` | Transferencias, movimiento de fondos |
| `xp` | `#FFB703` | Logros, cuotas, para tercero, warnings |

### Regla de uso semántico

```
bg-{color}-500/15  +  text-{color}-400   →  badge / chip
bg-{color}-500/10  +  text-{color}-300   →  card highlight / panel
hover:bg-{color}-500/20                  →  estado hover en item semántico
```

---

## Jerarquía de texto

| Nivel | Clase Tailwind | Uso |
|-------|---------------|-----|
| Display (montos grandes) | `text-3xl font-bold tabular-nums text-white` | Balance principal, monto en formulario |
| Section header | `text-base font-semibold text-white` | Título de página/sección |
| Card title | `text-sm font-semibold text-slate-200` | Nombre de categoría, cuenta |
| Body | `text-sm text-slate-300` | Descripciones, texto secundario |
| Label / Meta | `text-xs text-slate-400` | Fecha, cuenta, subcategoría |
| Caption / Hint | `text-xs text-slate-500` | Ayuda, totales pequeños, bordes de card |
| Micro (badges, nav) | `text-[10px] font-medium` | Chips, labels de bottom nav — NO usar para párrafos |

### Reglas obligatorias de tipografía
- **`tabular-nums`** en **todo** monto numérico (CurrencyDisplay ya lo aplica)
- **`truncate`** en nombres de categoría/cuenta dentro de cards densas
- **`text-balance`** en headings de página (h1, h2)
- **Nunca** `text-slate-900 / 800 / 700` — estos son tokens light-mode
- **Nunca** `text-success-600`, `text-danger-600`, `text-primary-600` — usar `-400` para dark

---

## Colores de texto por contexto

| Contexto | Token |
|----------|-------|
| Título principal / monto | `text-white` |
| Nombre de item (card title) | `text-slate-200` |
| Info secundaria (fecha, cuenta) | `text-slate-400` |
| Hint / deshabilitado | `text-slate-500` o `text-slate-600` |
| Ingreso con signo | `text-ingreso-400` |
| Gasto con signo | `text-gasto-400` |
| Ahorro con signo | `text-ahorro-400` |
| Acción/link | `text-brand-400` hover `text-brand-300` |

---

## Estados interactivos

```
hover normal:     hover:bg-night-3/50  o  hover:bg-white/5
hover semántico:  hover:bg-{color}-500/10
active:           active:bg-{color}-700
focus ring:       focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500
disabled:         opacity-40
```

---

## Componentes UI base

### Card
```tsx
<Card padding="sm|md|lg">   // bg-night-2 rounded-2xl border border-night-border/60
```

### Badge / Chip
```tsx
<span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-{color}-500/15 text-{color}-400">
```

### Input dark
```
bg-night-3 border border-night-border text-white rounded-xl px-3 py-2.5 text-sm
focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500
placeholder:text-slate-500
```

### Botón icon-only
```tsx
// SIEMPRE incluir aria-label
<button aria-label="Descripción de la acción" className="size-7 ...">
  <Icon className="h-4 w-4" />
</button>
```

---

## Accesibilidad mínima

- Todo botón icon-only **debe** tener `aria-label`
- Acciones destructivas **deben** pedir confirmación (modal AlertDialog, no `confirm()` nativo)
- Contraste mínimo: 4.5:1 para texto normal, 3:1 para texto grande (>18px)
- Touch targets mínimos: 44×44px (`min-h-[44px] min-w-[44px]` o `size-11`)

---

## Anti-patrones prohibidos

- ❌ `text-slate-900 / 800 / 700` en cualquier componente
- ❌ `bg-white`, `bg-slate-50 / 100` en componentes dark
- ❌ `text-success-600 / danger-600 / primary-600` — son light-mode
- ❌ `h-4.5 w-4.5` — no existe en Tailwind; usar `size-[18px]` o `size-5`
- ❌ `confirm()` nativo para eliminar datos
- ❌ Hex crudo `#XXXXXX` en className — solo en `style` cuando el valor viene de DB
- ❌ Números sin `tabular-nums`
- ❌ `h-screen` — usar `h-dvh`
