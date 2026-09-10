import { useCallback, useEffect, useRef, useState } from 'react'

const REST_FRAME = 0
// "1 → 2 → 3 → 2 → 1" from the spec, converted to 0-indexed frames.
const RING_SEQUENCE = [0, 1, 2, 1, 0]
const RING_STEP_MS = 80

export function useBellAnimation() {
  const [frameIndex, setFrameIndex] = useState(REST_FRAME)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const ring = useCallback(() => {
    clearTimeout(timerRef.current)
    let i = 0
    const step = () => {
      setFrameIndex(RING_SEQUENCE[i])
      i += 1
      if (i < RING_SEQUENCE.length) {
        timerRef.current = setTimeout(step, RING_STEP_MS)
      } else {
        timerRef.current = setTimeout(() => setFrameIndex(REST_FRAME), RING_STEP_MS)
      }
    }
    step()
  }, [])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return { frameIndex, ring }
}
