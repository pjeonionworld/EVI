import idleSheet from '@assets/npc/idle.png'
import walkSheet from '@assets/npc/walk.png'
import { SPRITE_FRAME_COUNT, WINDOW_HEIGHT, WINDOW_WIDTH } from '../../../shared/npcConfig'
import { useNpcBehavior } from './useNpcBehavior'

const SHEET_BY_STATE = {
  idle: idleSheet,
  walk: walkSheet
}

export function NpcView() {
  const { animState, frameIndex, direction, handlePointerDown, handlePointerMove, handlePointerUp } =
    useNpcBehavior()

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        backgroundImage: `url(${SHEET_BY_STATE[animState]})`,
        // the sheet is pre-scaled via backgroundSize so every frame cell
        // lines up exactly with the window's own (already small) size.
        backgroundSize: `${SPRITE_FRAME_COUNT * WINDOW_WIDTH}px ${WINDOW_HEIGHT}px`,
        backgroundPosition: `-${frameIndex * WINDOW_WIDTH}px 0`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        // the WALK sheet's natural pose faces right, so only mirror it when
        // moving left.
        transform: direction === -1 ? 'scaleX(-1)' : 'none',
        cursor: 'grab',
        touchAction: 'none'
      }}
    />
  )
}
