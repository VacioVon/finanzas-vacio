export type TipoCuenta = 'bancaria' | 'digital' | 'debito' | 'credito' | 'efectivo' | 'inversion'
export type TipoMovimiento = 'ingreso' | 'gasto' | 'ahorro' | 'pago_deuda' | 'transferencia' | 'pago_tarjeta'
export type TipoDeuda = 'credito_consumo' | 'prestamo_personal' | 'credito_comercial' | 'deuda_persona' | 'tarjeta_credito' | 'otra'
export type TipoCategoria = 'gasto' | 'ingreso' | 'ahorro' | 'inversion'
export type EstadoDeuda = 'activa' | 'pagada' | 'en_mora'
export type EstadoObjetivo = 'activo' | 'completado' | 'pausado'
export type FrecuenciaSuscripcion = 'semanal' | 'quincenal' | 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'anual'
export type TipoCompromiso = 'servicio' | 'gasto_fijo'
export type MontoTipoCompromiso = 'fijo' | 'estimado'

// ── Planificaciones ───────────────────────────────────────────
export type TipoPlanificacion = 'gasto' | 'ingreso' | 'ahorro' | 'mover'
export type EstadoPlanificacion = 'pendiente' | 'realizado' | 'cancelado'

// recurrencia = configuración estática (no incluye ocurrencias — eso va en ocurrencias_restantes)
export interface RecurrenciaPlan {
  frecuencia: 'semanal' | 'quincenal' | 'mensual' | 'personalizada'
  intervalo_dias?: number   // solo para frecuencia='personalizada'
  fin?: string | null       // DATE 'YYYY-MM-DD' o null = sin límite de fecha
}

export interface Planificacion {
  id: string
  user_id: string
  tipo: TipoPlanificacion
  monto: number
  fecha: string
  categoria_id: string | null
  subcategoria_id: string | null
  descripcion: string | null
  comercio: string | null
  cuenta_id: string | null
  cuenta_destino_id: string | null
  objetivo_id: string | null
  nota: string | null
  recurrencia: RecurrenciaPlan | null
  ocurrencias_restantes: number | null  // countdown; null = sin límite
  estado: EstadoPlanificacion
  movimiento_id: string | null
  created_at: string
  updated_at: string
  cuenta?: Cuenta
  cuenta_destino?: Cuenta
  categoria?: Categoria
  objetivo?: ObjetivoAhorro
}

export interface PlanificacionFormData {
  tipo: TipoPlanificacion
  monto: number
  fecha: string
  categoria_id?: string
  subcategoria_id?: string
  descripcion?: string
  comercio?: string
  cuenta_id?: string
  cuenta_destino_id?: string    // para 'mover'
  objetivo_id?: string          // para 'ahorro'
  nota?: string
  recurrencia?: RecurrenciaPlan
  ocurrencias_restantes?: number | null
}

export interface Profile {
  id: string
  nombre: string
  avatar_url: string | null
  fecha_sueldo: number | null
  moneda: string
  tema: 'light' | 'dark' | 'auto'
  created_at: string
  updated_at: string
}

export interface Cuenta {
  id: string
  usuario_id: string
  nombre: string
  tipo: TipoCuenta
  institucion: string | null
  saldo_actual: number
  saldo_inicial: number
  limite: number | null
  color: string
  activa: boolean
  // Metadata tarjeta de crédito
  dia_facturacion: number | null
  dia_vencimiento: number | null
  pago_minimo_pct: number | null
  created_at: string
  updated_at: string
}

export interface Categoria {
  id: string
  usuario_id: string | null
  nombre: string
  tipo: TipoCategoria
  emoji: string | null
  color: string | null
  activa: boolean
  es_default: boolean
  orden: number
  created_at: string
  subcategorias?: Subcategoria[]
}

export interface Subcategoria {
  id:           string
  categoria_id: string
  usuario_id:   string | null   // null = sistema; uuid = usuario
  nombre:       string
  activa:       boolean
  es_default:   boolean
  orden:        number
  created_at:   string
}

export interface Movimiento {
  id: string
  usuario_id: string
  tipo: TipoMovimiento
  fecha: string
  categoria_id: string | null
  subcategoria_id: string | null
  cuenta_id: string | null
  cuenta_destino_id: string | null
  objetivo_ahorro_id: string | null
  deuda_id: string | null
  compromiso_id: string | null
  monto: number
  comercio: string | null
  nota: string | null
  comprobante_url: string | null
  comision: number                 // cargo adicional (impuesto/fee) asociado a la compra; default 0
  para_tercero: boolean            // gasto realizado para otra persona
  tercero_nombre: string | null    // nombre de quien debe reembolsar
  fondos_tercero: boolean          // ingreso recibido en nombre de otra persona
  movimiento_origen_id: string | null
  capital: number | null           // desglose pago deuda: monto capital
  interes_pago: number | null      // desglose pago deuda: monto interés
  created_at: string
  updated_at: string
  categoria?: Categoria
  subcategoria?: Subcategoria
  cuenta?: Cuenta
  cuenta_destino?: Cuenta
}

export interface ObjetivoAhorro {
  id: string
  usuario_id: string
  nombre: string
  emoji: string | null
  color: string
  imagen_url: string | null
  monto_objetivo: number
  monto_actual: number
  fecha_objetivo: string | null
  descripcion: string | null
  estado: EstadoObjetivo
  created_at: string
  updated_at: string
}

export interface Presupuesto {
  id: string
  usuario_id: string
  categoria_id: string
  mes: number
  anio: number
  monto_presupuestado: number
  created_at: string
  updated_at: string
  categoria?: Categoria
  gastado?: number
}

export interface Deuda {
  id: string
  usuario_id: string
  nombre: string
  tipo_deuda: TipoDeuda | null
  categoria_id: string | null
  cuenta_id: string | null
  monto_total: number
  monto_pendiente: number
  cuotas_total: number
  cuotas_pagadas: number
  cuota_mensual: number | null      // monto fijo por cuota; null = pago libre
  interes: number
  fecha_compra: string
  fecha_prox_pago: string | null
  fecha_vencimiento: string | null  // último pago previsto; null = sin plazo
  estado: EstadoDeuda
  nota: string | null
  comprobante_url: string | null
  created_at: string
  updated_at: string
  categoria?: Categoria
  cuenta?: Cuenta
}

export interface DeudaFormData {
  nombre: string
  tipo_deuda?: TipoDeuda
  categoria_id?: string
  monto_total: number
  cuotas_total?: number
  cuota_mensual?: number
  interes?: number
  fecha_compra: string
  fecha_prox_pago?: string
  fecha_vencimiento?: string
  nota?: string
}

export interface Suscripcion {
  id: string
  usuario_id: string
  nombre: string
  emoji: string | null
  monto: number
  frecuencia: FrecuenciaSuscripcion
  dia_cobro: number | null
  cuenta_id: string | null
  categoria_id: string | null
  subcategoria_id: string | null
  activa: boolean
  proxima_fecha: string | null
  nota: string | null
  tipo: TipoCompromiso
  monto_tipo: MontoTipoCompromiso
  fecha_fin: string | null
  created_at: string
  updated_at: string
  cuenta?: Cuenta
  categoria?: Categoria
  subcategoria?: Subcategoria
}

export interface SaludFinanciera {
  id: string
  usuario_id: string
  puntaje: number
  comp_presupuestos: number
  comp_ahorros: number
  comp_deudas: number
  comp_flujo: number
  fecha_calculo: string
  created_at: string
}

// DTO para formularios
export interface MovimientoFormData {
  tipo: TipoMovimiento
  fecha: string
  categoria_id?: string          // opcional: no aplica en transferencias ni pago_tarjeta
  subcategoria_id?: string
  cuenta_id: string
  cuenta_destino_id?: string
  objetivo_ahorro_id?: string
  deuda_id?: string
  monto: number
  comercio?: string
  nota?: string
  comprobante_url?: string | null
  comision?: number
  para_tercero?: boolean
  tercero_nombre?: string
  fondos_tercero?: boolean
}

export interface Valorizacion {
  id: string
  usuario_id: string
  cuenta_id: string
  fecha: string
  valor: number
  nota: string | null
  created_at: string
}

export interface CuentaFormData {
  nombre: string
  tipo: TipoCuenta
  institucion?: string
  saldo_inicial: number
  limite?: number
  color: string
  // Metadata tarjeta de crédito (solo aplica cuando tipo='credito')
  dia_facturacion?: number
  dia_vencimiento?: number
  pago_minimo_pct?: number
}

export interface CategoriaFormData {
  nombre: string
  tipo:   TipoCategoria
  emoji?: string
  color?: string
}

export interface PresupuestoFormData {
  categoria_id:        string
  mes:                 number
  anio:                number
  monto_presupuestado: number
}

export interface PresupuestoConProgreso extends Presupuesto {
  gastado:    number
  porcentaje: number
  excedido:   boolean
}

export interface ObjetivoFormData {
  nombre:          string
  emoji?:          string
  color:           string
  imagen_url?:     string
  monto_objetivo:  number
  fecha_objetivo?: string
  descripcion?:    string
}

// ── Cuotas de tarjeta de crédito ─────────────────────────────
export type EstadoCuota = 'activa' | 'completada' | 'cancelada'

export interface CuotaCredito {
  id:             string
  usuario_id:     string
  cuenta_id:      string
  nombre:         string
  emoji:          string | null
  monto_total:    number
  monto_cuota:    number
  cuotas_total:   number
  cuotas_pagadas: number
  interes:        number
  comision:       number           // cargo adicional (impuesto/fee); informacional
  para_tercero:   boolean          // compra realizada para otra persona
  tercero_nombre: string | null    // nombre de quien recibe la compra
  fecha_inicio:   string      // DATE 'YYYY-MM-DD'
  estado:         EstadoCuota
  nota:           string | null
  created_at:     string
  updated_at:     string
  // join
  cuenta?:        Cuenta
}

export interface CuotaFormData {
  cuenta_id:               string
  nombre:                  string
  emoji?:                  string
  monto_total:             number
  monto_cuota:             number
  cuotas_total:            number
  cuotas_pagadas_inicial?: number   // para carga de historial; default 0
  interes?:                number
  comision?:               number   // cargo adicional opcional; default 0
  para_tercero?:           boolean
  tercero_nombre?:         string
  fecha_inicio:            string
  nota?:                   string
}

export interface SuscripcionFormData {
  nombre:        string
  emoji?:        string
  monto:         number
  frecuencia:    FrecuenciaSuscripcion
  dia_cobro?:    number
  cuenta_id?:      string
  categoria_id?:   string
  subcategoria_id?: string
  proxima_fecha?:  string
  nota?:           string
  tipo?:           TipoCompromiso
  monto_tipo?:     MontoTipoCompromiso
  fecha_fin?:      string
}

export type TipoAporteObjetivo = 'aporte' | 'retiro' | 'ajuste'

export interface AporteObjetivo {
  id:          string
  usuario_id:  string
  objetivo_id: string
  monto:       number     // positivo = aporte, negativo = retiro
  tipo:        TipoAporteObjetivo
  fecha:       string     // DATE string 'YYYY-MM-DD'
  nota:        string | null
  created_at:  string
}

// Resumen financiero calculado
export interface CuentaPorCobrar {
  id:                   string
  usuario_id:           string
  movimiento_origen_id: string | null
  persona:              string
  descripcion:          string | null
  monto_original:       number
  monto_pagado:         number
  fecha:                string
  fecha_vencimiento:    string | null
  estado:               'pendiente' | 'pagado' | 'cancelado'
  nota:                 string | null
  created_at:           string
  updated_at:           string
  pagos_cobrar?:        PagoCobrar[]
}

export interface PagoCobrar {
  id:                   string
  cuenta_por_cobrar_id: string
  movimiento_id:        string | null
  monto:                number
  fecha:                string
  nota:                 string | null
  created_at:           string
}

export interface ResumenFinanciero {
  totalCuentas: number
  totalInversiones: number
  totalDeudas: number
  patrimonioNeto: number
  ingresosDelMes: number
  gastosDelMes: number
  ahorrosDelMes: number
}
