import { useEffect, useRef, useState } from 'react'

/** Animate changes so the effect of an entry is visible; respect reduced motion. */
export function useAnimatedNumber(value: number, duration = 520) {
  const [displayed, setDisplayed] = useState(value)
  const currentValue = useRef(value)

  useEffect(() => {
    const start = currentValue.current
    if (start === value) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const frame = requestAnimationFrame(() => {
        currentValue.current = value
        setDisplayed(value)
      })
      return () => cancelAnimationFrame(frame)
    }

    let frame = 0
    const startedAt = performance.now()
    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 4)
      currentValue.current = progress === 1 ? value : start + (value - start) * eased
      setDisplayed(currentValue.current)
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return displayed
}
