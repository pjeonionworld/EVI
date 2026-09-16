import cleanSheet from '@assets/npc/clean.png'
import idleSheet from '@assets/npc/idle.png'
import walkSheet from '@assets/npc/walk.png'
import walkDownSheet from '@assets/npc/walk_down.png'
import walkUpSheet from '@assets/npc/walk_up.png'
import './NpcView.css'
import {
  CLEAN_FRAME_COUNT,
  IDLE_FRAME_COUNT,
  WALK_FRAME_COUNT,
  WINDOW_HEIGHT,
  WINDOW_WIDTH
} from '../../../shared/npcConfig'
import { useNpcBehavior } from './useNpcBehavior'

export function NpcView() {
  const { animState, walkFacing, frameIndex, handlePointerDown, handlePointerMove, handlePointerUp } =
    useNpcBehavior()

  let sheet = idleSheet
  let frameCount = IDLE_FRAME_COUNT
  let mirrored = false

  if (animState === 'clean') {
    sheet = cleanSheet
    frameCount = CLEAN_FRAME_COUNT
  } else if (animState === 'walk') {
    frameCount = WALK_FRAME_COUNT
    if (walkFacing === 'down') {
      sheet = walkDownSheet
    } else if (walkFacing === 'up') {
      sheet = walkUpSheet
    } else {
      // left/right share the same sheet — its natural pose faces right, so
      // only mirror it when moving left.
      sheet = walkSheet
      mirrored = walkFacing === 'left'
    }
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="npc-sprite pixelated"
      style={{
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        backgroundImage: `url(${sheet})`,
        // the sheet is pre-scaled via backgroundSize so every frame cell
        // lines up exactly with the window's own (already small) size.
        backgroundSize: `${frameCount * WINDOW_WIDTH}px ${WINDOW_HEIGHT}px`,
        backgroundPosition: `-${frameIndex * WINDOW_WIDTH}px 0`,
        transform: mirrored ? 'scaleX(-1)' : 'none'
      }}
    />
  )
}
