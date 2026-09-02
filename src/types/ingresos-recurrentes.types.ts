export type FrecuenciaIngreso = 'mensual' | 'quincenal' | 'semanal' | 'bimestral'
export type TipoFechaIngreso  = 'fijo' | 'aproximado'
export type EstadoInstancia   = 'pendiente' | 'confirmado' | 'pospuesto' | 'no_recibido'

export interface FuenteIngreso {
  id:          string
  usuario_id:  string
  nombre:      string
  descripcion: string | null
  activa:      boolean
  created_at:  string
}

export interface IngresoRecurrente {
  id:              string
  fuente_id:       string | null
  fuente_nombre:   string | null
  nombre:          string
  monto_esperado:  number
  cuenta_id:       string | null
  cuenta_nombre:   string | null
  frecuencia:      FrecuenciaIngreso
  dia_esperado:    number
  tolerancia_dias: number
  tipo_fecha:      TipoFechaIngreso
  activo:          boolean
  nota:            string | null
  created_at:      string
}

export interface IngresoPendienteHoy {
  instancia_id:          string
  ingreso_recurrente_id: string
  nombre:                string
  fuente_nombre:         string | null
  monto_esperado:        number
  cuenta_id:             string | null
  cuenta_nombre:         string | null
  fecha_esperada:        string
  fecha_min:             string
  fecha_max:             string
  tolerancia_dias:       number
  tipo_fecha:            TipoFechaIngreso
  periodo_ref:           string
  estado:                EstadoInstancia
}

export interface IngresoMes {
  instancia_id:          string
  ingreso_recurrente_id: string
  fuente_id:             string | null
  fuente_nombre:         string | null
  nombre:                string
  monto_esperado:        number
  monto_confirmado:      number | null
  cuenta_id:             string | null
  cuenta_nombre:         string | null
  fecha_esperada:        string
  fecha_min:             string
  fecha_max:             string
  tipo_fecha:            TipoFechaIngreso
  tolerancia_dias:       number
  estado:                EstadoInstancia
  movimiento_id:         string | null
  periodo_ref:           string
}

export interface ConfirmarIngresoResultado {
  ok:            boolean
  error?:        string
  ya_confirmado?: boolean
  movimiento_id?: string
  monto?:        number
}

export interface CreateIngresoRecurrenteForm {
  nombre:          string
  monto_esperado:  number
  cuenta_id:       string | null
  fuente_id:       string | null
  frecuencia:      FrecuenciaIngreso
  dia_esperado:    number
  tolerancia_dias: number
  tipo_fecha:      TipoFechaIngreso
  nota:            string
}
