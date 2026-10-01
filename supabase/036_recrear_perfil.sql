-- Recrear fila en profiles para que el usuario pueda guardar su perfil
INSERT INTO public.profiles (id, nombre, moneda, created_at, updated_at)
VALUES (
  '1efded94-1423-417c-8c6b-56fd54c2364d',
  '',
  'CLP',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

SELECT id, nombre, moneda FROM public.profiles WHERE id = '1efded94-1423-417c-8c6b-56fd54c2364d';
