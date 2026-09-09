import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DRAG_RESUME_DELAY_MS,
  IDLE_FRAME_INTERVAL_MS,
  IDLE_MAX_MS,
  IDLE_MIN_MS,
  MOVE_TICK_MS,
  SPRITE_FRAME_COUNT,
  WALK_FRAME_INTERVAL_MS,
  WALK_MAX_MS,
  WALK_MIN_MS,
  WALK_SPEED_PX_PER_SEC
} from '../../../shared/npcConfig'

export type AnimState = 'idle' | 'walk'
export type Direction = -1 | 1 // -1 = left (flipped), 1 = right (sprite's natural facing)

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

interface DragState {
  startMouseX: number
  startMouseY: number
  startWinX: number
  startWinY: number
}

export function useNpcBehavior() {
  const [animState, setAnimState] = useState<AnimState>('idle')
  const [frameIndex, setFrameIndex] = useState(0)
  const [direction, setDirection] = useState<Direction>(-1)
  const [isDragging, setIsDragging] = useState(false)

  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const moveIntervalRef = useRef<ReturnType<typeof setInterval>>()
  const walkEndAtRef = useRef(0)
  const pausedRef = useRef(false)
  const dragStateRef = useRef<DragState | null>(null)

  const scheduleNextIdle = useCallback(() => {
    clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      if (pausedRef.current) return
      startWalk()
    }, randomBetween(IDLE_MIN_MS, IDLE_MAX_MS))
  }, [])

  const endWalk = useCallback(() => {
    clearInterval(moveIntervalRef.current)
    setAnimState('idle')
    setFrameIndex(0)
    scheduleNextIdle()
  }, [scheduleNextIdle])

  const startWalk = useCallback(() => {
    const dir: Direction = Math.random() < 0.5 ? -1 : 1
    setDirection(dir)
    setAnimState('walk')
    walkEndAtRef.current = Date.now() + randomBetween(WALK_MIN_MS, WALK_MAX_MS)

    clearInterval(moveIntervalRef.current)
    moveIntervalRef.current = setInterval(() => {
      if (pausedRef.current) return
      const dx = (dir * WALK_SPEED_PX_PER_SEC * MOVE_TICK_MS) / 1000
      window.evi.moveBy(dx).then((result) => {
        const timeUp = Date.now() >= walkEndAtRef.current
        if (timeUp || result.hitLeft || result.hitRight) {
          endWalk()
        }
      })
    }, MOVE_TICK_MS)
  }, [endWalk])

  // Frame cycling — independent of movement, just drives which cell shows.
  useEffect(() => {
    const interval = animState === 'walk' ? WALK_FRAME_INTERVAL_MS : IDLE_FRAME_INTERVAL_MS
    const id = setInterval(() => {
      setFrameIndex((f) => (f + 1) % SPRITE_FRAME_COUNT)
    }, interval)
    return () => clearInterval(id)
  }, [animState])

  // Kick off autonomous behavior on mount.
  useEffect(() => {
    scheduleNextIdle()
    return () => {
      clearTimeout(idleTimerRef.current)
      clearInterval(moveIntervalRef.current)
    }
  }, [scheduleNextIdle])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    pausedRef.current = true
    setIsDragging(true)
    setAnimState('idle')
    setFrameIndex(0)
    clearTimeout(idleTimerRef.current)
    clearInterval(moveIntervalRef.current)

    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)

    const { screenX, screenY } = e
    window.evi.getBounds().then(({ x, y }) => {
      dragStateRef.current = { startMouseX: screenX, startMouseY: screenY, startWinX: x, startWinY: y }
    })
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragStateRef.current
    if (!drag) return
    const dx = e.screenX - drag.startMouseX
    const dy = e.screenY - drag.startMouseY
    window.evi.setPosition(drag.startWinX + dx, drag.startWinY + dy)
  }, [])

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStateRef.current) return
      dragStateRef.current = null
      setIsDragging(false)
      e.currentTarget.releasePointerCapture(e.pointerId)

      idleTimerRef.current = setTimeout(() => {
        pausedRef.current = false
        scheduleNextIdle()
      }, DRAG_RESUME_DELAY_MS)
    },
    [scheduleNextIdle]
  )

  return {
    animState,
    frameIndex,
    direction,
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp
  }
}
