import { useEffect, useState } from 'react'
import type { VideoRecommendation } from '../../../shared/youtubeTypes'
import './VideoRecommendPanel.css'

interface VideoRecommendPanelProps {
  onBack: () => void
}

// Swapped in for the menu grid when "영상 추천" is clicked (see DeskView) —
// occupies the exact same content area, not a separate popup.
export function VideoRecommendPanel({ onBack }: VideoRecommendPanelProps) {
  const [videos, setVideos] = useState<VideoRecommendation[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [isMeasuring, setIsMeasuring] = useState(false)

  useEffect(() => {
    let cancelled = false
    window.evi
      .getVideoRecommendations()
      .then((result) => {
        if (!cancelled) setVideos(result)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    window.evi.getMealtimeMeasuring().then((value) => {
      if (!cancelled) setIsMeasuring(value)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const toggleMeasuring = () => {
    if (isMeasuring) {
      window.evi.stopMealtimeMeasurement()
    } else {
      window.evi.startMealtimeMeasurement()
    }
    setIsMeasuring((prev) => !prev)
  }

  return (
    <div className="panel">
      <div className="panel-header video-recommend-header">
        <span onClick={onBack} title="메뉴로 돌아가기" className="panel-back">
          ‹ 메뉴
        </span>
        <span className="panel-title video-recommend-title">오늘 볼 만한 영상</span>
        <span
          onClick={toggleMeasuring}
          title="식사하면서 볼 때 켜두면, 지금 보는 영상이 다음 추천에 더 반영돼요"
          className={`video-recommend-toggle ${
            isMeasuring ? 'video-recommend-toggle--active' : 'video-recommend-toggle--inactive'
          }`}
        >
          {isMeasuring ? '■ 측정끝' : '● 측정시작'}
        </span>
      </div>

      <div className="video-recommend-list">
        {videos === null && !failed && (
          <div className="panel-empty video-recommend-empty">추천 영상을 고르는 중...</div>
        )}
        {failed && <div className="panel-empty panel-empty--error video-recommend-empty">영상을 불러오지 못했어요.</div>}
        {videos?.length === 0 && (
          <div className="panel-empty video-recommend-empty">아직 추천할 만한 시청 기록이 없어요.</div>
        )}
        {/* Single line per video, not title+reason stacked — the content
            area is only ~75px tall for all 3 rows combined, and a 2-line
            card doesn't fit (verified: it silently collapses to 0 height
            under flexbox's default min-height:auto shrink behavior).
            Reason/full title move into the tooltip instead. */}
        {videos?.map((video) => (
          <div
            key={video.videoUrl}
            onClick={() => window.evi.openVideo(video.videoUrl)}
            title={`${video.title}\n${video.reason}`}
            className="panel-row video-recommend-row"
          >
            <span className="panel-row-title">{video.title}</span>
            <span className="panel-row-meta">{video.channel}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
