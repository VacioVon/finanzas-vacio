import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  r: number
  opacity: number
  speed: number   // velocidad de pulso
  phase: number   // fase inicial del pulso
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
      const count = Math.floor((canvas.width * canvas.height) / 3000)
      starsRef.current = Array.from({ length: count }, () => ({
        x:       Math.random() * canvas.width,
        y:       Math.random() * canvas.height,
        r:       Math.random() * 1.1 + 0.2,
        opacity: Math.random() * 0.5 + 0.2,
        speed:   Math.random() * 0.6 + 0.2,
        phase:   Math.random() * Math.PI * 2
      }))
    }

    function draw(t: number) {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const s of starsRef.current) {
        // Pulso suave: ±20% sobre la opacidad base
        const pulse = s.opacity + Math.sin(t * 0.001 * s.speed + s.phase) * s.opacity * 0.3
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)

        // Color: mezcla blanco-frío con leve tinte azul-violeta
        const hue = 220 + Math.random() * 60  // 220–280 (azul a violeta)
        ctx.fillStyle = `hsla(${hue}, 60%, 92%, ${Math.min(1, pulse)})`
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
