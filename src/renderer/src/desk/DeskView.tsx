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
import { IDLE_FRAME_COUNT, IDLE_FRAME_INTERVAL_MS, WINDOW_HEIGHT, WINDOW_WIDTH } from '../../../shared/npcConfig'
import './DeskView.css'
import { JobPostingPanel } from './JobPostingPanel'
import { useBellAnimation } from './useBellAnimation'
import { VideoRecommendPanel } from './VideoRecommendPanel'

// UI shell only — no real Tool/Agent behavior yet, just the menu surface.
// 포켓몬 스타일 대화 선택지 — 세로 목록에서 항목을 고르면 동작이 즉시 실행되거나
// (채용공고/영상 시청처럼) 해당 패널로 전환됨.
//
// "채용공고"/"영상 시청"은 당분간 비활성화 — 기능(JobPostingPanel/
// VideoRecommendPanel, 관련 IPC)은 그대로 남아 있고 메뉴에서만 뺀 상태.
// 다시 켜려면 아래 메뉴 목록에 두 항목을 다시 추가하면 됨.

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
  const [activePanel, setActivePanel] = useState<'menu' | 'videoRecommend' | 'jobPosting'>('menu')
  const [mouseFollowEnabled, setMouseFollowEnabled] = useState(false)
  // "책상 숨기기" — DESK.png 그래픽만 안 보이게 함(호출벨/EXIT/대화창은 그대로
  // 동작). 이 창 안에서만 의미 있는 순수 시각 옵션이라 다른 창과 공유할 필요가
  // 없어 mouseFollowEnabled와 달리 main IPC 없이 로컬 state로만 관리.
  const [deskHidden, setDeskHidden] = useState(false)

  useEffect(() => {
    return window.evi.onTalkState(setIsTalking)
  }, [])

  useEffect(() => {
    window.evi.getMouseFollowEnabled().then(setMouseFollowEnabled)
  }, [])

  // Docked EVI's own idle animation. A tiny local ticker rather than
  // reusing useNpcBehavior, since that hook belongs to the (now hidden)
  // NPC window and docked EVI has nothing to do but idle here.
  useEffect(() => {
    if (!isTalking) return
    const id = setInterval(() => {
      setDockedFrame((f) => (f + 1) % IDLE_FRAME_COUNT)
    }, IDLE_FRAME_INTERVAL_MS)
    return () => clearInterval(id)
  }, [isTalking])

  const handleBellClick = () => {
    ring()
    window.evi.ringBell()
  }

  const handleCloseTalk = () => {
    setIsTalking(false)
    setActivePanel('menu')
    window.evi.closeTalk()
  }

  const toggleMouseFollow = () => {
    const next = !mouseFollowEnabled
    window.evi.setMouseFollowEnabled(next)
    setMouseFollowEnabled(next)
  }

  const toggleDeskHidden = () => {
    setDeskHidden((prev) => !prev)
  }

  return (
    <div className="desk-root" style={{ width: DESK_WINDOW_WIDTH, height: DESK_WINDOW_HEIGHT }}>
      {isTalking && (
        <div
          className="desk-docked-npc pixelated"
          style={{
            left: dockedPos.x,
            top: dockedPos.y,
            width: WINDOW_WIDTH,
            height: WINDOW_HEIGHT,
            backgroundImage: `url(${idleSheet})`,
            backgroundSize: `${IDLE_FRAME_COUNT * WINDOW_WIDTH}px ${WINDOW_HEIGHT}px`,
            backgroundPosition: `-${dockedFrame * WINDOW_WIDTH}px 0`
          }}
        />
      )}

      {!deskHidden && (
        <div
          className="desk-graphic pixelated"
          style={{
            left: deskLeft,
            width: DESK_DISPLAY_WIDTH,
            height: DESK_DISPLAY_HEIGHT,
            backgroundImage: `url(${deskImg})`,
            backgroundSize: `${DESK_CANVAS_WIDTH * DESK_SCALE}px ${DESK_CANVAS_HEIGHT * DESK_SCALE}px`,
            backgroundPosition: `-${DESK_BBOX_X * DESK_SCALE}px -${DESK_BBOX_Y * DESK_SCALE}px`
          }}
        />
      )}

      <div
        onClick={handleBellClick}
        title="EVI 호출"
        className="desk-bell pixelated"
        style={{
          top: buttonColumnTop,
          left: buttonColumnLeft + bellLeftInColumn,
          width: BELL_DISPLAY_WIDTH,
          height: BELL_DISPLAY_HEIGHT,
          backgroundImage: `url(${bellSheet})`,
          backgroundSize: `${BELL_FRAME_COUNT * BELL_DISPLAY_WIDTH}px ${BELL_DISPLAY_HEIGHT}px`,
          backgroundPosition: `-${bellFrame * BELL_DISPLAY_WIDTH}px 0`
        }}
      />

      <img
        src={exitImg}
        onClick={() => setExitConfirmOpen(true)}
        title="이비 퇴근시키기"
        className="desk-exit pixelated"
        style={{
          top: exitTop,
          left: buttonColumnLeft + exitLeftInColumn,
          width: EXIT_DISPLAY_WIDTH,
          height: EXIT_DISPLAY_HEIGHT
        }}
      />

      {isTalking && (
        <div
          className="desk-talk-menu pixelated"
          style={{
            left: TALK_MENU_LEFT,
            bottom: TALK_MENU_BOTTOM,
            width: talkMenuSize.width,
            height: talkMenuSize.height,
            backgroundImage: `url(${talkMenuImg})`,
            backgroundSize: `${talkMenuSize.width}px ${talkMenuSize.height}px`
          }}
        >
          <div onClick={handleCloseTalk} title="닫기" className="desk-talk-menu-close">
            ✕
          </div>

          <div
            className="desk-talk-menu-content"
            style={{
              left: `${TALK_MENU_CONTENT_LEFT * 100}%`,
              top: `${TALK_MENU_CONTENT_TOP * 100}%`,
              width: `${TALK_MENU_CONTENT_WIDTH * 100}%`,
              height: `${TALK_MENU_CONTENT_HEIGHT * 100}%`
            }}
          >
            {activePanel === 'menu' ? (
              <div className="desk-menu">
                <div className="desk-menu-header">무엇을 도와드릴까요?</div>
                <div className="desk-menu-list">
                  <div onClick={toggleMouseFollow} className="desk-menu-row">
                    <span className="desk-menu-cursor">▶</span>
                    <span className="desk-menu-label">
                      마우스 따라다니기: {mouseFollowEnabled ? '켜짐' : '꺼짐'}
                    </span>
                  </div>
                  <div onClick={toggleDeskHidden} className="desk-menu-row">
                    <span className="desk-menu-cursor">▶</span>
                    <span className="desk-menu-label">책상 숨기기: {deskHidden ? '켜짐' : '꺼짐'}</span>
                  </div>
                  <div onClick={handleCloseTalk} className="desk-menu-row">
                    <span className="desk-menu-cursor">▶</span>
                    <span className="desk-menu-label">대화 종료</span>
                  </div>
                </div>
              </div>
            ) : activePanel === 'videoRecommend' ? (
              <VideoRecommendPanel onBack={() => setActivePanel('menu')} />
            ) : (
              <JobPostingPanel onBack={() => setActivePanel('menu')} />
            )}
          </div>
        </div>
      )}

      {exitConfirmOpen && (
        <div className="desk-exit-overlay">
          <div
            className="desk-exit-popup"
            style={{ left: deskCenterX, bottom: DESK_DISPLAY_HEIGHT + 16 }}
          >
            <div className="desk-exit-popup-text">이비를 퇴근시키겠습니까?</div>
            <div className="desk-exit-popup-buttons">
              <button onClick={() => window.evi.quitApp()} className="desk-exit-btn desk-exit-btn--confirm">
                퇴근시키기
              </button>
              <button onClick={() => setExitConfirmOpen(false)} className="desk-exit-btn desk-exit-btn--cancel">
                아직이야
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
