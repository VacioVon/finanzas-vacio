import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { signUp } from '@/services/auth.service'

const schema = z.object({
  nombre:   z.string().min(2, 'Ingresa tu nombre'),
  email:    z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirm:  z.string()
}).refine(d => d.password === d.confirm, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm']
})

type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormValues) {
    setError('')
    try {
      await signUp(data.email, data.password, data.nombre)
      setDone(true)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear cuenta'
      if (msg.includes('already registered')) {
        setError('Este email ya está registrado')
      } else {
        setError(msg)
      }
    }
  }

  if (done) {
    return (
      <AuthLayout>
        <div className="text-center py-6">
          <span className="text-5xl">🎉</span>
          <h2 className="text-lg font-bold text-slate-900 mt-4">¡Cuenta creada!</h2>
          <p className="text-sm text-slate-500 mt-2">
            Revisa tu email para confirmar tu cuenta.
          </p>
          <Link
            to="/login"
            className="block mt-5 text-primary-600 font-medium text-sm hover:underline"
          >
            Ir al login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h2 className="text-lg font-bold text-slate-900 mb-1">Crear cuenta</h2>
      <p className="text-sm text-slate-500 mb-6">Comienza a controlar tus finanzas</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nombre"
          placeholder="Diego"
          autoComplete="name"
          {...register('nombre')}
          error={errors.nombre?.message}
        />
        <Input
          label="Email"
          type="email"
          placeholder="diego@ejemplo.com"
          autoComplete="email"
          {...register('email')}
          error={errors.email?.message}
        />
        <Input
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          {...register('password')}
          error={errors.password?.message}
        />
        <Input
          label="Confirmar contraseña"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          {...register('confirm')}
          error={errors.confirm?.message}
        />

        {error && (
          <div className="p-3 bg-danger-50 rounded-xl text-sm text-danger-700">
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" fullWidth loading={isSubmitting} size="lg">
          Crear cuenta
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-5">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="text-primary-600 font-medium hover:underline">
          Ingresar
        </Link>
      </p>
    </AuthLayout>
  )
}
