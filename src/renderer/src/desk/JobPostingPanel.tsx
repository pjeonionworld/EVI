import { useEffect, useState } from 'react'
import type { JobPosting } from '../../../shared/jobTypes'
import './JobPostingPanel.css'

interface JobPostingPanelProps {
  onBack: () => void
}

// Swapped in for the menu grid when "채용공고" is clicked (see DeskView) —
// same content-area slot as VideoRecommendPanel, but a scrollable list
// instead of fixed even-split rows, since the number of postings for a
// given day varies instead of always being a fixed count of 3.
export function JobPostingPanel({ onBack }: JobPostingPanelProps) {
  const [postings, setPostings] = useState<JobPosting[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    window.evi
      .getTodayJobPostings()
      .then((result) => {
        if (!cancelled) setPostings(result)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="panel">
      <div className="panel-header">
        <span onClick={onBack} title="메뉴로 돌아가기" className="panel-back">
          ‹ 메뉴
        </span>
        <span className="panel-title">오늘의 채용공고</span>
      </div>

      <div className="job-posting-list">
        {postings === null && !failed && (
          <div className="panel-empty job-posting-empty">채용공고를 불러오는 중...</div>
        )}
        {failed && <div className="panel-empty panel-empty--error job-posting-empty">채용공고를 불러오지 못했어요.</div>}
        {postings?.length === 0 && (
          <div className="panel-empty job-posting-empty">오늘 등록된 채용공고가 없어요.</div>
        )}
        {/* Single line per posting (title + location), same reasoning as
            VideoRecommendPanel — this content area is only ~75px tall, and
            a 2-line card collapses to 0 height under flexbox's default
            min-height:auto shrink behavior. */}
        {postings?.map((posting) => (
          <div
            key={posting.applyUrl}
            onClick={() => window.evi.openJobPosting(posting.applyUrl)}
            title={posting.title}
            className="panel-row job-posting-row"
          >
            <span className="panel-row-title">{posting.title}</span>
            <span className="panel-row-meta">{posting.location}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
