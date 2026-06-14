// 24 colores en 3 filas de 8
const PRESET_COLORS = [
  // Fila 1: azules, violetas, rosas
  '#2563EB', '#1D4ED8', '#7C3AED', '#9333EA', '#DB2777', '#EC4899', '#F43F5E', '#DC2626',
  // Fila 2: cálidos, tierra
  '#EA580C', '#D97706', '#CA8A04', '#65A30D', '#16A34A', '#059669', '#0891B2', '#0284C7',
  // Fila 3: oscuros, neutros
  '#1E3A5F', '#1E293B', '#374151', '#52525B', '#78716C', '#57534E', '#292524', '#6B7280',
]

interface ColorPickerProps {
  value:    string
  onChange: (color: string) => void
  label?:   string
}

export function ColorPicker({ value, onChange, label = 'Color' }: ColorPickerProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      )}
      <div className="grid grid-cols-8 gap-2">
        {PRESET_COLORS.map(color => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className="w-8 h-8 rounded-full transition-all hover:scale-110 focus:outline-none flex-shrink-0"
            style={{
              backgroundColor: color,
              boxShadow: value === color
                ? `0 0 0 2px white, 0 0 0 4px ${color}`
                : '0 1px 3px rgba(0,0,0,0.2)'
            }}
            aria-label={color}
          />
        ))}
      </div>
    </div>
  )
}
