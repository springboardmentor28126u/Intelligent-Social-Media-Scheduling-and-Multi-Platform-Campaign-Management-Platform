import { useEffect, useRef, useState } from 'react'

/** Animate a number from its previous value to the new one (respects reduced motion). */
export function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const start = from.current
    if (typeof target !== 'number' || !Number.isFinite(target) || start === target) return undefined
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let frame
    const began = performance.now()
    const step = now => {
      const t = reduce ? 1 : Math.min((now - began) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(start + (target - start) * eased)
      if (t < 1) frame = requestAnimationFrame(step)
      else from.current = target
    }
    frame = requestAnimationFrame(step)
    return () => { cancelAnimationFrame(frame); from.current = target }
  }, [target, duration])
  return value
}
