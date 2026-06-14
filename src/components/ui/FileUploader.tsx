import { useRef, useState } from 'react'
import { Paperclip, X, Loader2, FileText, ImageIcon } from 'lucide-react'
import { uploadComprobante, deleteComprobante } from '@/services/movimientos.service'
import { useAuthStore } from '@/store/authStore'

interface FileUploaderProps {
  value?: string | null
  onChange: (url: string | null) => void
}

const MAX_MB   = 5
const MAX_BYTES = MAX_MB * 1024 * 1024
const ACCEPTED  = 'image/jpeg,image/jpg,image/png,image/webp,application/pdf'

function isPDF(url: string) {
  return url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('application/pdf')
}

export function FileUploader({ value, onChange }: FileUploaderProps) {
  const { user } = useAuthStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')

  async function handleFile(file: File) {
    setError('')
    if (file.size > MAX_BYTES) {
      setError(`El archivo supera ${MAX_MB} MB`)
      return
    }

    setUploading(true)
    try {
      const url = await uploadComprobante(user!.id, file)
      onChange(url)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al subir archivo')
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove() {
    if (!value) return
    try {
      await deleteComprobante(value)
    } catch {
      // ignorar error al eliminar, igual limpiamos la UI
    }
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">
        Comprobante (opcional)
      </label>

      {/* Vista previa */}
      {value && (
        <div className="relative flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
          {isPDF(value) ? (
            <FileText className="h-8 w-8 text-danger-500 flex-shrink-0" />
          ) : (
            <img
              src={value}
              alt="Comprobante"
              className="h-10 w-10 object-cover rounded-lg flex-shrink-0 border border-slate-200"
            />
          )}
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-xs text-primary-600 hover:underline truncate"
          >
            {isPDF(value) ? 'Ver PDF' : 'Ver imagen'}
          </a>
          <button
            type="button"
            onClick={handleRemove}
            className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors text-slate-400 hover:text-danger-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Botón de carga */}
      {!value && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-slate-200 hover:border-primary-400 hover:bg-primary-50 transition-colors text-sm text-slate-400 hover:text-primary-600 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
          {uploading ? 'Subiendo...' : 'Adjuntar comprobante'}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {error && <p className="text-xs text-danger-600">{error}</p>}
      <p className="text-xs text-slate-400">Imágenes o PDF · máx. {MAX_MB} MB</p>
    </div>
  )
}
