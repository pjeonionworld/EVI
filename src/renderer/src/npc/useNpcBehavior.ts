import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CALL_SPEED_PX_PER_SEC,
  CLEAN_CHANCE,
  CLEAN_CYCLES,
  CLEAN_FRAME_COUNT,
  CLEAN_FRAME_INTERVAL_MS,
  DRAG_RESUME_DELAY_MS,
  FOLLOW_SPEED_PX_PER_SEC,
  FOLLOW_STOP_DISTANCE_PX,
  IDLE_FRAME_COUNT,
  IDLE_FRAME_INTERVAL_MS,
  IDLE_MAX_MS,
  IDLE_MIN_MS,
  MOVE_TICK_MS,
  WALK_FRAME_COUNT,
  WALK_FRAME_INTERVAL_MS,
  WALK_SPEED_PX_PER_SEC,
  WINDOW_HEIGHT,
  WINDOW_WIDTH
} from '../../../shared/npcConfig'

export type AnimState = 'idle' | 'walk' | 'clean'
// Movement is axis-aligned only (see planAxisSegments) — no diagonal WALK,
// so only these four cardinal facings exist. 'left'/'right' share the WALK
// sheet (mirrored via CSS); 'down'/'up' each have their own sheet.
export type WalkFacing = 'left' | 'right' | 'down' | 'up'

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

interface AxisSegment {
  axis: 'x' | 'y'
  target: number
}

// Splits a straight-line move into up to two axis-aligned legs (horizontal
// then vertical, or vice versa, order randomized for variety) so the NPC
// only ever moves left/right/up/down — never diagonally.
function planAxisSegments(start: Point, target: Point): AxisSegment[] {
  const segments: AxisSegment[] = []
  const firstAxis: 'x' | 'y' = Math.random() < 0.5 ? 'x' : 'y'
  const axes: ('x' | 'y')[] = firstAxis === 'x' ? ['x', 'y'] : ['y', 'x']
  for (const axis of axes) {
    if (axis === 'x' && Math.abs(target.x - start.x) > 0.5) {
      segments.push({ axis: 'x', target: target.x })
    }
    if (axis === 'y' && Math.abs(target.y - start.y) > 0.5) {
      segments.push({ axis: 'y', target: target.y })
    }
  }
  return segments
}

export function useNpcBehavior() {
  const [animState, setAnimState] = useState<AnimState>('idle')
  const [frameIndex, setFrameIndex] = useState(0)
  const [walkFacing, setWalkFacing] = useState<WalkFacing>('right')
  const [isDragging, setIsDragging] = useState(false)

  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const moveIntervalRef = useRef<ReturnType<typeof setInterval>>()
  const pausedRef = useRef(false)
  // True while EVI has been summoned by the call bell — takes priority
  // over the normal random idle/walk scheduling until cancelled by a drag.
  const calledRef = useRef(false)
  const dragStateRef = useRef<DragState | null>(null)
  const posRef = useRef<Point | null>(null)
  const segmentsRef = useRef<AxisSegment[]>([])

  // "마우스 따라다니기" — on while the desk menu toggle is enabled. Takes
  // priority over the normal random idle/walk scheduling (like calledRef),
  // but yields to it (calledRef checked every followTick).
  const followRef = useRef(false)
  const followIntervalRef = useRef<ReturnType<typeof setInterval>>()

  // Runs one axis-aligned leg of a multi-segment move, ticking every
  // MOVE_TICK_MS, then recurses into the next leg (switching sprite/facing
  // as the active axis changes) until all segments are done, then calls
  // onArrive. Shared by both random autonomous walks and the call-bell
  // "run to the desk" walk — only the segment list, speed and arrival
  // behavior differ between the two.
  const runSegment = useCallback(
    (index: number, speed: number, onArrive: () => void) => {
      const segments = segmentsRef.current
      if (index >= segments.length) {
        onArrive()
        return
      }
      const seg = segments[index]
      const pos = posRef.current
      if (!pos) return

      if (seg.axis === 'x') {
        setWalkFacing(seg.target > pos.x ? 'right' : 'left')
      } else {
        setWalkFacing(seg.target > pos.y ? 'down' : 'up')
      }
      setAnimState('walk')

      clearInterval(moveIntervalRef.current)
      moveIntervalRef.current = setInterval(() => {
        if (pausedRef.current) return
        const p = posRef.current
        if (!p) return

        const current = seg.axis === 'x' ? p.x : p.y
        const remaining = seg.target - current
        const remDist = Math.abs(remaining)
        const stepDist = (speed * MOVE_TICK_MS) / 1000
        const arrived = remDist <= stepDist
        const step = arrived ? remaining : Math.sign(remaining) * stepDist

        const dx = seg.axis === 'x' ? step : 0
        const dy = seg.axis === 'y' ? step : 0

        window.evi.moveBy(dx, dy).then((result) => {
          if (pausedRef.current) return
          posRef.current = result
          if (arrived) {
            runSegment(index + 1, speed, onArrive)
          }
        })
      }, MOVE_TICK_MS)
    },
    []
  )

  const scheduleNextIdle = useCallback(() => {
    clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      if (pausedRef.current || calledRef.current || followRef.current) return
      if (Math.random() < CLEAN_CHANCE) {
        startClean()
      } else {
        startWalk()
      }
    }, randomBetween(IDLE_MIN_MS, IDLE_MAX_MS))
  }, [])

  // Runs after a drag ends, a call/talk session ends, or on mount — resumes
  // whichever autonomous behavior should currently be driving EVI. Follow
  // mode's own interval (started/stopped only by the toggle itself) picks
  // movement back up on its own next tick, so this only needs to reset the
  // sprite and, when follow is off, fall back to the normal idle/walk timer.
  const resumeAutonomy = useCallback(() => {
    setAnimState('idle')
    setFrameIndex(0)
    if (!followRef.current) {
      scheduleNextIdle()
    }
  }, [scheduleNextIdle])

  // One tick of "마우스 따라다니기": re-reads the live cursor position (it
  // moves every tick, unlike startWalk's one-shot target) and steps toward
  // it along whichever axis is currently further off, so movement stays
  // axis-aligned like every other EVI movement instead of cutting diagonally.
  const followTick = useCallback(() => {
    if (pausedRef.current || calledRef.current || !followRef.current) return

    Promise.all([window.evi.getBounds(), window.evi.getCursorPoint()]).then(([bounds, cursor]) => {
      if (pausedRef.current || calledRef.current || !followRef.current) return

      const centerX = bounds.x + WINDOW_WIDTH / 2
      const centerY = bounds.y + WINDOW_HEIGHT / 2
      const dxTotal = cursor.x - centerX
      const dyTotal = cursor.y - centerY
      const dist = Math.hypot(dxTotal, dyTotal)

      if (dist <= FOLLOW_STOP_DISTANCE_PX) {
        setAnimState('idle')
        setFrameIndex(0)
        return
      }

      const stepDist = (FOLLOW_SPEED_PX_PER_SEC * MOVE_TICK_MS) / 1000
      let dx = 0
      let dy = 0
      if (Math.abs(dxTotal) >= Math.abs(dyTotal)) {
        dx = Math.sign(dxTotal) * Math.min(stepDist, Math.abs(dxTotal))
        setWalkFacing(dxTotal > 0 ? 'right' : 'left')
      } else {
        dy = Math.sign(dyTotal) * Math.min(stepDist, Math.abs(dyTotal))
        setWalkFacing(dyTotal > 0 ? 'down' : 'up')
      }
      setAnimState('walk')
      window.evi.moveBy(dx, dy)
    })
  }, [])

  const startFollow = useCallback(() => {
    clearTimeout(idleTimerRef.current)
    clearInterval(moveIntervalRef.current)
    setAnimState('idle')
    setFrameIndex(0)
    clearInterval(followIntervalRef.current)
    followIntervalRef.current = setInterval(followTick, MOVE_TICK_MS)
  }, [followTick])

  const stopFollow = useCallback(() => {
    clearInterval(followIntervalRef.current)
    resumeAutonomy()
  }, [resumeAutonomy])

  // Initial toggle state + live updates while the desk menu is open (see
  // DeskView / mouseFollowIpc.ts) — main is the source of truth since the
  // toggle lives in a different window.
  useEffect(() => {
    window.evi.getMouseFollowEnabled().then((enabled) => {
      followRef.current = enabled
      if (enabled) startFollow()
    })
    return window.evi.onMouseFollowChanged((enabled) => {
      followRef.current = enabled
      if (enabled) {
        startFollow()
      } else {
        stopFollow()
      }
    })
  }, [startFollow, stopFollow])

  const endWalk = useCallback(() => {
    clearInterval(moveIntervalRef.current)
    setAnimState('idle')
    setFrameIndex(0)
    scheduleNextIdle()
  }, [scheduleNextIdle])

  // Picks one random point anywhere within the screen's work area and walks
  // there via axis-aligned legs (see planAxisSegments), stopping (and going
  // back to IDLE) on arrival.
  const startWalk = useCallback(() => {
    if (pausedRef.current || calledRef.current) return

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

      posRef.current = bounds
      segmentsRef.current = planAxisSegments(bounds, target)
      if (segmentsRef.current.length === 0) {
        endWalk()
        return
      }
      runSegment(0, WALK_SPEED_PX_PER_SEC, endWalk)
    })
  }, [runSegment, endWalk])

  // Plays the CLEAN sheet for CLEAN_CYCLES full cycles, then returns to
  // IDLE. Frame advancement/stop-condition lives in the frame-cycling
  // effect below (keyed on animState==='clean').
  const startClean = useCallback(() => {
    if (pausedRef.current || calledRef.current) return
    setAnimState('clean')
    setFrameIndex(0)
  }, [])

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
        posRef.current = bounds
        segmentsRef.current = planAxisSegments(bounds, target)
        const arrive = () => {
          clearInterval(moveIntervalRef.current)
          setAnimState('idle')
          setFrameIndex(0)
          window.evi.notifyArrived()
          // Deliberately no scheduleNextIdle() here — calledRef staying
          // true keeps autonomous roaming paused until a drag cancels it.
        }
        if (segmentsRef.current.length === 0) {
          arrive()
          return
        }
        runSegment(0, CALL_SPEED_PX_PER_SEC, arrive)
      })
    },
    [runSegment]
  )

  useEffect(() => {
    return window.evi.onCalled(startCall)
  }, [startCall])

  // Talk dialog's X button (see DeskView) — ends the docked/talk state and
  // lets EVI roam freely again, exactly like resuming after a drag.
  useEffect(() => {
    return window.evi.onResume(() => {
      calledRef.current = false
      resumeAutonomy()
    })
  }, [resumeAutonomy])

  // Frame cycling — independent of movement, just drives which cell shows.
  // CLEAN is one-shot-ish (plays CLEAN_CYCLES full loops, then hands back
  // to IDLE) rather than looping forever like idle/walk.
  useEffect(() => {
    if (animState === 'clean') {
      let played = 0
      const totalFrames = CLEAN_FRAME_COUNT * CLEAN_CYCLES
      const id = setInterval(() => {
        played += 1
        if (played >= totalFrames) {
          clearInterval(id)
          setAnimState('idle')
          setFrameIndex(0)
          scheduleNextIdle()
          return
        }
        setFrameIndex(played % CLEAN_FRAME_COUNT)
      }, CLEAN_FRAME_INTERVAL_MS)
      return () => clearInterval(id)
    }

    const interval = animState === 'walk' ? WALK_FRAME_INTERVAL_MS : IDLE_FRAME_INTERVAL_MS
    const frameCount = animState === 'walk' ? WALK_FRAME_COUNT : IDLE_FRAME_COUNT
    const id = setInterval(() => {
      setFrameIndex((f) => (f + 1) % frameCount)
    }, interval)
    return () => clearInterval(id)
  }, [animState, scheduleNextIdle])

  // Kick off autonomous behavior on mount.
  useEffect(() => {
    scheduleNextIdle()
    return () => {
      clearTimeout(idleTimerRef.current)
      clearInterval(moveIntervalRef.current)
      clearInterval(followIntervalRef.current)
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
        resumeAutonomy()
      }, DRAG_RESUME_DELAY_MS)
    },
    [resumeAutonomy]
  )

  return {
    animState,
    frameIndex,
    walkFacing,
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp
  }
}
