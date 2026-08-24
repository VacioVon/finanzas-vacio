import { useState } from 'react'
import { X } from 'lucide-react'

// Emojis organizados por categoría financiera
const EMOJI_GROUPS = [
  {
    label: 'Finanzas',
    emojis: ['💰','💵','💴','💶','💷','💳','🏦','📈','📉','📊','🏧','💸','🪙','💹','🤑']
  },
  {
    label: 'Hogar',
    emojis: ['🏠','🏡','🛋️','🛏️','🪴','🧹','🔧','💡','🚿','🛁','🪟','🚪','🏗️','⚡','💧']
  },
  {
    label: 'Alimentación',
    emojis: ['🍔','🍕','🛒','🥗','🍱','☕','🍺','🥩','🍎','🧃','🥐','🍜','🍣','🥑','🎂']
  },
  {
    label: 'Transporte',
    emojis: ['🚗','🚕','🏍️','🚌','✈️','🚂','🛵','🚲','⛽','🅿️','🛣️','🚢','🚁','🛺','🛻']
  },
  {
    label: 'Salud',
    emojis: ['❤️','🏥','💊','🩺','🦷','👓','🏋️','🧘','🩹','💉','🧬','🫀','🧪','🌡️','🛌']
  },
  {
    label: 'Educación',
    emojis: ['📚','🎓','✏️','💻','🖥️','📝','🔬','🎨','🎭','🎵','📖','🏫','🧑‍💻','📐','🔭']
  },
  {
    label: 'Entretenimiento',
    emojis: ['🎮','🎬','🎤','🎸','📺','🎡','🎳','🎯','🃏','🧩','🎲','🎪','🤸','🎰','🎻']
  },
  {
    label: 'Ropa y estilo',
    emojis: ['👕','👗','👠','👟','👔','🧥','🕶️','👜','💍','⌚','🧣','🎩','👒','🩳','🧤']
  },
  {
    label: 'Mascotas',
    emojis: ['🐶','🐱','🐹','🐰','🦜','🐠','🐍','🦎','🐾','🦮','🐈','🐇','🐟','🦴','🐾']
  },
  {
    label: 'Familia y social',
    emojis: ['👨‍👩‍👧','❤️','💑','👶','🎁','🎉','🎂','🍾','💒','🤝','🫂','👴','👵','🧒','🎊']
  },
  {
    label: 'Trabajo',
    emojis: ['💼','🖨️','📱','📞','🖊️','📋','🗂️','📌','🏢','👷','🧑‍💼','⚙️','🔑','📮','🗃️']
  },
  {
    label: 'Viajes',
    emojis: ['🌍','🏖️','⛺','🗺️','🧳','🏔️','🌅','🗼','🏕️','🌴','🧭','🎑','🗽','🏯','🌋']
  },
]

interface EmojiPickerProps {
  value?:   string
  onChange: (emoji: string) => void
  label?:   string
}

export function EmojiPicker({ value, onChange, label = 'Icono' }: EmojiPickerProps) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')

  const allEmojis = EMOJI_GROUPS.flatMap(g => g.emojis)
  const filtered = query.trim()
    ? EMOJI_GROUPS.filter(g =>
        g.label.toLowerCase().includes(query.toLowerCase()) ||
        g.emojis.some(() => false)  // por ahora solo filtra por grupo
      )
    : EMOJI_GROUPS

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="size-12 rounded-2xl border-2 border-night-border hover:border-brand-500/60 flex items-center justify-center text-2xl transition-colors bg-night-3"
        >
          {value || '➕'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-slate-400 hover:text-gasto-400 transition-colors"
          >
            Quitar
          </button>
        )}
        {!value && (
          <span className="text-xs text-slate-400">Toca para elegir un ícono</span>
        )}
      </div>

      {/* Panel flotante */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-night-1 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md max-h-[75vh] flex flex-col border border-night-border">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
              <h3 className="text-base font-semibold text-white">Elegir ícono</h3>
              <button
                onClick={() => setOpen(false)}
                className="size-8 flex items-center justify-center rounded-full hover:bg-night-3"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            {/* Búsqueda por grupo */}
            <div className="px-5 pb-2 flex-shrink-0">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por categoría (ej: Hogar, Salud...)"
                className="w-full text-sm px-3 py-2 bg-night-3 text-white border border-night-border rounded-xl outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 placeholder:text-slate-500"
              />
            </div>

            {/* Lista de emojis */}
            <div className="overflow-y-auto flex-1 px-5 pb-5">
              {filtered.map(group => (
                <div key={group.label} className="mb-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-8 gap-1">
                    {group.emojis.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => { onChange(emoji); setOpen(false); setQuery('') }}
                        className={[
                          'w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-all',
                          'hover:bg-brand-500/10 hover:scale-110',
                          value === emoji ? 'bg-brand-500/20 ring-2 ring-brand-500/60' : ''
                        ].join(' ')}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
