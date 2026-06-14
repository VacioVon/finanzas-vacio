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
        <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-12 h-12 rounded-2xl border-2 border-slate-200 hover:border-primary-400 flex items-center justify-center text-2xl transition-colors bg-white"
        >
          {value || '➕'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-slate-400 hover:text-danger-500 transition-colors"
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
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md max-h-[75vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
              <h3 className="text-base font-semibold text-slate-900">Elegir ícono</h3>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100"
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
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
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
                          'hover:bg-primary-50 hover:scale-110',
                          value === emoji ? 'bg-primary-100 ring-2 ring-primary-400' : ''
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
