import deskImg from '@assets/environment/DESK.png'
import bellSheet from '@assets/environment/call-bell.png'
import exitImg from '@assets/environment/exit.png'
import talkMenuImg from '@assets/environment/talk-menu.png'
import idleSheet from '@assets/npc/idle.png'
import { useEffect, useState } from 'react'
import {
  BELL_DISPLAY_HEIGHT,
  BELL_DISPLAY_WIDTH,
  BELL_FRAME_COUNT,
  DESK_BBOX_X,
  DESK_BBOX_Y,
  DESK_CANVAS_HEIGHT,
  DESK_CANVAS_WIDTH,
  DESK_DISPLAY_HEIGHT,
  DESK_DISPLAY_WIDTH,
  DESK_SCALE,
  DESK_WINDOW_HEIGHT,
  DESK_WINDOW_WIDTH,
  EXIT_DISPLAY_HEIGHT,
  EXIT_DISPLAY_WIDTH,
  getBellLeftInColumn,
  getButtonColumnLeft,
  getButtonColumnTop,
  getDeskLeft,
  getDockedLocalPosition,
  getExitLeftInColumn,
  getExitTop,
  getTalkMenuDisplaySize,
  TALK_MENU_BOTTOM,
  TALK_MENU_CONTENT_HEIGHT,
  TALK_MENU_CONTENT_LEFT,
  TALK_MENU_CONTENT_TOP,
  TALK_MENU_CONTENT_WIDTH,
  TALK_MENU_LEFT
} from '../../../shared/environmentConfig'
import { IDLE_FRAME_INTERVAL_MS, SPRITE_FRAME_COUNT, WINDOW_HEIGHT, WINDOW_WIDTH } from '../../../shared/npcConfig'
import { useBellAnimation } from './useBellAnimation'

// UI shell only — no real Tool/Agent behavior yet, just the menu surface.
const MENU_ITEMS = ['오늘 할 일', '영상 추천', '채용공고', '오늘의 운세', '재정', '무엇이든 물어보기']

const deskLeft = getDeskLeft()
const deskCenterX = Math.round(deskLeft + DESK_DISPLAY_WIDTH / 2)
const dockedPos = getDockedLocalPosition()
const buttonColumnLeft = getButtonColumnLeft()
const bellLeftInColumn = getBellLeftInColumn()
const exitLeftInColumn = getExitLeftInColumn()
const buttonColumnTop = getButtonColumnTop()
const exitTop = getExitTop()
const talkMenuSize = getTalkMenuDisplaySize()

export function DeskView() {
  const { frameIndex: bellFrame, ring } = useBellAnimation()
  const [isTalking, setIsTalking] = useState(false)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
  const [dockedFrame, setDockedFrame] = useState(0)

  useEffect(() => {
    return window.evi.onTalkState(setIsTalking)
  }, [])

  // Docked EVI's own idle animation. A tiny local ticker rather than
  // reusing useNpcBehavior, since that hook belongs to the (now hidden)
  // NPC window and docked EVI has nothing to do but idle here.
  useEffect(() => {
    if (!isTalking) return
    const id = setInterval(() => {
      setDockedFrame((f) => (f + 1) % SPRITE_FRAME_COUNT)
    }, IDLE_FRAME_INTERVAL_MS)
    return () => clearInterval(id)
  }, [isTalking])

  const handleBellClick = () => {
    ring()
    window.evi.ringBell()
  }

  const handleCloseTalk = () => {
    setIsTalking(false)
    window.evi.closeTalk()
  }

  return (
    <div style={{ position: 'relative', width: DESK_WINDOW_WIDTH, height: DESK_WINDOW_HEIGHT }}>
      {/* Docked EVI — drawn first so the desk graphic below paints over her
          lower body, leaving only the head/shoulders visible above it. */}
      {isTalking && (
        <div
          style={{
            position: 'absolute',
            left: dockedPos.x,
            top: dockedPos.y,
            width: WINDOW_WIDTH,
            height: WINDOW_HEIGHT,
            backgroundImage: `url(${idleSheet})`,
            backgroundSize: `${SPRITE_FRAME_COUNT * WINDOW_WIDTH}px ${WINDOW_HEIGHT}px`,
            backgroundPosition: `-${dockedFrame * WINDOW_WIDTH}px 0`,
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated'
          }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          left: deskLeft,
          bottom: 0,
          width: DESK_DISPLAY_WIDTH,
          height: DESK_DISPLAY_HEIGHT,
          // DESK.png's object only fills part of its canvas — crop to just
          // the object's own bbox the same way sprite frames are cropped,
          // instead of scaling the whole (mostly-empty) canvas down.
          backgroundImage: `url(${deskImg})`,
          backgroundSize: `${DESK_CANVAS_WIDTH * DESK_SCALE}px ${DESK_CANVAS_HEIGHT * DESK_SCALE}px`,
          backgroundPosition: `-${DESK_BBOX_X * DESK_SCALE}px -${DESK_BBOX_Y * DESK_SCALE}px`,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated'
        }}
      />

      {/* Call bell + exit sit just to the right of the desk graphic, stacked
          and centered against its height, so the three read as one
          reception-desk unit rather than a window-corner toolbar. */}
      <div
        onClick={handleBellClick}
        title="EVI 호출"
        style={{
          position: 'absolute',
          top: buttonColumnTop,
          left: buttonColumnLeft + bellLeftInColumn,
          width: BELL_DISPLAY_WIDTH,
          height: BELL_DISPLAY_HEIGHT,
          backgroundImage: `url(${bellSheet})`,
          backgroundSize: `${BELL_FRAME_COUNT * BELL_DISPLAY_WIDTH}px ${BELL_DISPLAY_HEIGHT}px`,
          backgroundPosition: `-${bellFrame * BELL_DISPLAY_WIDTH}px 0`,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
          cursor: 'pointer'
        }}
      />

      <img
        src={exitImg}
        onClick={() => setExitConfirmOpen(true)}
        title="이비 퇴근시키기"
        style={{
          position: 'absolute',
          top: exitTop,
          left: buttonColumnLeft + exitLeftInColumn,
          width: EXIT_DISPLAY_WIDTH,
          height: EXIT_DISPLAY_HEIGHT,
          imageRendering: 'pixelated',
          cursor: 'pointer'
        }}
      />

      {isTalking && (
        // EVI's main conversation surface, not a small popup — sized to
        // take up most of the window's width, opening to the left of the
        // desk/bell/exit unit. talk-menu.png already has EVI's portrait +
        // nameplate baked into its right side, so content stays clear of
        // that ~30% and is vertically centered rather than clustered at top.
        <div
          style={{
            position: 'absolute',
            left: TALK_MENU_LEFT,
            bottom: TALK_MENU_BOTTOM,
            width: talkMenuSize.width,
            height: talkMenuSize.height,
            backgroundImage: `url(${talkMenuImg})`,
            backgroundSize: `${talkMenuSize.width}px ${talkMenuSize.height}px`,
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated'
          }}
        >
          <div
            onClick={handleCloseTalk}
            title="닫기"
            style={{
              position: 'absolute',
              top: -12,
              right: -8,
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: '#fbf6ec',
              border: '2px solid #5a4632',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              fontWeight: 'bold',
              color: '#5a4632',
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
            }}
          >
            ✕
          </div>

          {/* Menu items overlaid on the blank part of the dialog art — text
              is never baked into talk-menu.png itself. Positioned against
              TALK_MENU_CONTENT_*, the plain cream interior measured
              directly from the art (excludes the borders and the
              portrait/nameplate tab in the box's upper-right), so this
              stays correct however big the dialog itself is sized. */}
          <div
            style={{
              position: 'absolute',
              left: `${TALK_MENU_CONTENT_LEFT * 100}%`,
              top: `${TALK_MENU_CONTENT_TOP * 100}%`,
              width: `${TALK_MENU_CONTENT_WIDTH * 100}%`,
              height: `${TALK_MENU_CONTENT_HEIGHT * 100}%`,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gridAutoRows: '1fr',
              gap: '4%',
              overflow: 'hidden'
            }}
          >
            {MENU_ITEMS.map((item) => (
              <div
                key={item}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15,
                  padding: '4% 6%',
                  background: 'rgba(255,255,255,0.55)',
                  borderRadius: 8,
                  textAlign: 'center',
                  color: '#3a2c1a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {exitConfirmOpen && (
        <div style={{ position: 'absolute', inset: 0, background: 'transparent' }}>
          {/* Anchored above the desk graphic (centered over it, bottom edge
              clear of its top edge) rather than the whole window, so it
              reads as a popup from the desk instead of floating over the
              table or the unrelated talk-menu area to its left. */}
          <div
            style={{
              position: 'absolute',
              left: deskCenterX,
              bottom: DESK_DISPLAY_HEIGHT + 16,
              transform: 'translateX(-50%)',
              background: '#fff',
              borderRadius: 10,
              padding: '16px 18px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              width: 'max-content'
            }}
          >
            <div style={{ fontSize: 13, color: '#222', textAlign: 'center', whiteSpace: 'nowrap' }}>
              이비를 퇴근시키겠습니까?
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => window.evi.quitApp()}
                style={{
                  fontSize: 12,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#d9534f',
                  color: '#fff',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                퇴근시키기
              </button>
              <button
                onClick={() => setExitConfirmOpen(false)}
                style={{
                  fontSize: 12,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #ccc',
                  background: '#f2f2f2',
                  color: '#333',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                아직이야
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
