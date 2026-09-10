import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CALL_SPEED_PX_PER_SEC,
  DRAG_RESUME_DELAY_MS,
  IDLE_FRAME_INTERVAL_MS,
  IDLE_MAX_MS,
  IDLE_MIN_MS,
  MOVE_TICK_MS,
  SPRITE_FRAME_COUNT,
  WALK_FRAME_INTERVAL_MS,
  WALK_SPEED_PX_PER_SEC,
  WINDOW_HEIGHT,
  WINDOW_WIDTH
} from '../../../shared/npcConfig'

export type AnimState = 'idle' | 'walk'
export type Direction = -1 | 1 // -1 = left (flipped), 1 = right (sprite's natural facing)

// Below this much horizontal distance to the target, a walk is treated as
// "basically vertical" and keeps whichever way the NPC was already facing
// instead of flipping.
const DIRECTION_DEADZONE_PX = 8

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

interface Point {
  x: number
  y: number
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
  const pausedRef = useRef(false)
  // True while EVI has been summoned by the call bell — takes priority
  // over the normal random idle/walk scheduling until cancelled by a drag.
  const calledRef = useRef(false)
  const dragStateRef = useRef<DragState | null>(null)
  const posRef = useRef<Point | null>(null)
  const targetRef = useRef<Point | null>(null)

  // Shared stepping engine: moves in a straight line from startPos to
  // target at the given speed, ticking every MOVE_TICK_MS, and calls
  // onArrive once it snaps to the target. Used for both random autonomous
  // walks and the call-bell "run to the desk" walk — only the target,
  // speed and arrival behavior differ between the two.
  const runMoveLoop = useCallback((startPos: Point, target: Point, speed: number, onArrive: () => void) => {
    posRef.current = startPos
    targetRef.current = target
    setAnimState('walk')

    const dx = target.x - startPos.x
    if (Math.abs(dx) > DIRECTION_DEADZONE_PX) {
      setDirection(dx > 0 ? 1 : -1)
    }

    clearInterval(moveIntervalRef.current)
    moveIntervalRef.current = setInterval(() => {
      if (pausedRef.current) return
      const pos = posRef.current
      const dest = targetRef.current
      if (!pos || !dest) return

      const remDx = dest.x - pos.x
      const remDy = dest.y - pos.y
      const remDist = Math.hypot(remDx, remDy)
      const stepDist = (speed * MOVE_TICK_MS) / 1000

      const arrived = remDist <= stepDist
      const stepDx = arrived ? remDx : (remDx / remDist) * stepDist
      const stepDy = arrived ? remDy : (remDy / remDist) * stepDist

      window.evi.moveBy(stepDx, stepDy).then((result) => {
        if (pausedRef.current) return
        posRef.current = result
        if (arrived) onArrive()
      })
    }, MOVE_TICK_MS)
  }, [])

  const scheduleNextIdle = useCallback(() => {
    clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      if (pausedRef.current || calledRef.current) return
      startWalk()
    }, randomBetween(IDLE_MIN_MS, IDLE_MAX_MS))
  }, [])

  const endWalk = useCallback(() => {
    clearInterval(moveIntervalRef.current)
    setAnimState('idle')
    setFrameIndex(0)
    scheduleNextIdle()
  }, [scheduleNextIdle])

  // Picks one random point anywhere within the screen's work area and walks
  // there in a straight line, stopping (and going back to IDLE) on arrival.
  const startWalk = useCallback(() => {
    if (pausedRef.current || calledRef.current) return
    setAnimState('walk')

    Promise.all([window.evi.getBounds(), window.evi.getWorkArea()]).then(([bounds, work]) => {
      if (pausedRef.current || calledRef.current) return

      const minX = work.x
      const maxX = work.x + work.width - WINDOW_WIDTH
      const minY = work.y
      const maxY = work.y + work.height - WINDOW_HEIGHT
      const target: Point = {
        x: minX + Math.random() * Math.max(0, maxX - minX),
        y: minY + Math.random() * Math.max(0, maxY - minY)
      }

      runMoveLoop(bounds, target, WALK_SPEED_PX_PER_SEC, endWalk)
    })
  }, [runMoveLoop, endWalk])

  // Triggered by the call bell (see App.tsx / preload onCalled) — drops
  // whatever EVI was doing and hurries to the given point beside the desk.
  const startCall = useCallback(
    (target: Point) => {
      if (dragStateRef.current) return // ignore a call while actively being dragged
      calledRef.current = true
      pausedRef.current = false
      clearTimeout(idleTimerRef.current)
      clearInterval(moveIntervalRef.current)

      window.evi.getBounds().then((bounds) => {
        if (!calledRef.current) return // cancelled (e.g. dragged) while this was in flight
        runMoveLoop(bounds, target, CALL_SPEED_PX_PER_SEC, () => {
          clearInterval(moveIntervalRef.current)
          setAnimState('idle')
          setFrameIndex(0)
          window.evi.notifyArrived()
          // Deliberately no scheduleNextIdle() here — calledRef staying
          // true keeps autonomous roaming paused until a drag cancels it.
        })
      })
    },
    [runMoveLoop]
  )

  useEffect(() => {
    return window.evi.onCalled(startCall)
  }, [startCall])

  // Talk dialog's X button (see DeskView) — ends the docked/talk state and
  // lets EVI roam freely again, exactly like resuming after a drag.
  useEffect(() => {
    return window.evi.onResume(() => {
      calledRef.current = false
      scheduleNextIdle()
    })
  }, [scheduleNextIdle])

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
    if (calledRef.current) {
      calledRef.current = false
      window.evi.notifyCallCancelled()
    }
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
