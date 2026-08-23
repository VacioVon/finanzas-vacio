import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  r: number
  baseOpacity: number
  speed: number
  phase: number
  hue: number
  bloom: boolean   // estrellas brillantes con efecto halo
}

export function StarField({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const starsRef  = useRef<Star[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      if (!canvas) return
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      buildStars()
    }

    function buildStars() {
      if (!canvas) return
      // ~1 estrella cada 1200px² → modal típico 400×600 ≈ 200 estrellas
      const count = Math.floor((canvas.width * canvas.height) / 1200)
      starsRef.current = Array.from({ length: count }, () => {
        const bloom = Math.random() < 0.12  // 12% de estrellas brillantes con bloom
        return {
          x:           Math.random() * canvas.width,
          y:           Math.random() * canvas.height,
          r:           bloom ? Math.random() * 1.4 + 0.8 : Math.random() * 0.9 + 0.2,
          baseOpacity: bloom ? Math.random() * 0.4 + 0.55 : Math.random() * 0.45 + 0.15,
          speed:       Math.random() * 0.5 + 0.15,
          phase:       Math.random() * Math.PI * 2,
          hue:         Math.floor(210 + Math.random() * 80),  // azul → violeta
          bloom
        }
      })
    }

    function draw(t: number) {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const s of starsRef.current) {
        const pulse = s.baseOpacity + Math.sin(t * 0.001 * s.speed + s.phase) * s.baseOpacity * 0.35
        const op    = Math.min(1, Math.max(0, pulse))

        if (s.bloom) {
          // Halo exterior difuso
          const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5)
          grad.addColorStop(0,   `hsla(${s.hue}, 70%, 92%, ${op * 0.55})`)
          grad.addColorStop(0.4, `hsla(${s.hue}, 60%, 88%, ${op * 0.18})`)
          grad.addColorStop(1,   `hsla(${s.hue}, 50%, 80%, 0)`)
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r * 5, 0, Math.PI * 2)
          ctx.fillStyle = grad
          ctx.fill()
        }

        // Núcleo de la estrella
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${s.hue}, 65%, 95%, ${op})`
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      ro.disconnect()
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  )
}
