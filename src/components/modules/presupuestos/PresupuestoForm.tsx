import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useCategoriasByTipo } from '@/hooks/useCategorias'
import { useCreatePresupuesto, useUpdatePresupuesto } from '@/hooks/usePresupuestos'
import type { PresupuestoConProgreso } from '@/types/app.types'

const schema = z.object({
  categoria_id:        z.string().min(1, 'Selecciona una categoría'),
  monto_presupuestado: z.coerce.number().positive('Debe ser mayor a 0')
})
type FormValues = z.infer<typeof schema>

interface PresupuestoFormProps {
  isOpen:    boolean
  onClose:   () => void
  mes:       number
  anio:      number
  editing?:  PresupuestoConProgreso | null
  // IDs ya asignados para excluirlos de la lista
  categoriasUsadas?: string[]
}

export function PresupuestoForm({
  isOpen,
  onClose,
  mes,
  anio,
  editing,
  categoriasUsadas = []
}: PresupuestoFormProps) {
  const { data: categorias } = useCategoriasByTipo('gasto')
  const createMutation = useCreatePresupuesto()
  const updateMutation = useUpdatePresupuesto()

  const {
    register, handleSubmit, reset,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { categoria_id: '', monto_presupuestado: 0 }
  })

  useEffect(() => {
    if (isOpen) {
      if (editing) {
        reset({
          categoria_id:        editing.categoria_id,
          monto_presupuestado: editing.monto_presupuestado
        })
      } else {
        reset({ categoria_id: '', monto_presupuestado: 0 })
      }
    }
  }, [isOpen, editing])  // eslint-disable-line react-hooks/exhaustive-deps

  // Categorías disponibles: excluye las que ya tienen presupuesto este mes
  const disponibles = (categorias ?? []).filter(
    c => editing ? true : !categoriasUsadas.includes(c.id)
  )

  const categoriaOptions = disponibles.map(c => ({
    value: c.id,
    label: `${c.emoji ?? ''} ${c.nombre}`.trim()
  }))

  async function onSubmit(data: FormValues) {
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id:    editing.id,
          monto: data.monto_presupuestado
        })
      } else {
        await createMutation.mutateAsync({
          categoria_id:        data.categoria_id,
          mes,
          anio,
          monto_presupuestado: data.monto_presupuestado
        })
      }
      onClose()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Editar presupuesto' : 'Nuevo presupuesto'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!editing && (
          <Select
            label="Categoría"
            options={categoriaOptions}
            placeholder="Selecciona una categoría"
            {...register('categoria_id')}
            error={errors.categoria_id?.message}
          />
        )}
        {editing && (
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ backgroundColor: `${editing.categoria?.color ?? '#6B7280'}20` }}
            >
              {editing.categoria?.emoji ?? '📁'}
            </div>
            <p className="text-sm font-semibold text-slate-900">{editing.categoria?.nombre}</p>
          </div>
        )}

        <div>
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">Monto mensual</label>
          <div className="relative mt-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">$</span>
            <input
              {...register('monto_presupuestado')}
              type="number"
              inputMode="numeric"
              placeholder="0"
              className={[
                'w-full h-14 pl-8 pr-4 text-center text-2xl font-bold rounded-2xl border bg-white',
                'outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                errors.monto_presupuestado ? 'border-danger-400' : 'border-slate-200'
              ].join(' ')}
            />
          </div>
          {errors.monto_presupuestado && (
            <p className="text-xs text-danger-600 mt-1">{errors.monto_presupuestado.message}</p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" fullWidth loading={isLoading}>
            {editing ? 'Guardar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
