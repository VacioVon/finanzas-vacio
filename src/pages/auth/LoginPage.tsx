import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { signIn } from '@/services/auth.service'

const schema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres')
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormValues) {
    setError('')
    try {
      await signIn(data.email, data.password)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al iniciar sesión'
      if (msg.includes('Invalid login')) {
        setError('Email o contraseña incorrectos')
      } else {
        setError(msg)
      }
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-lg font-bold text-slate-900 mb-1">Bienvenido</h2>
      <p className="text-sm text-slate-500 mb-6">Ingresa a tu cuenta</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          autoComplete="current-password"
          {...register('password')}
          error={errors.password?.message}
        />

        {error && (
          <div className="p-3 bg-danger-50 rounded-xl text-sm text-danger-700">
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" fullWidth loading={isSubmitting} size="lg">
          Ingresar
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-5">
        ¿No tienes cuenta?{' '}
        <Link to="/register" className="text-primary-600 font-medium hover:underline">
          Crear cuenta
        </Link>
      </p>
    </AuthLayout>
  )
}
