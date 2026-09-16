import { existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import ExcelJS from 'exceljs'
import type { JobPosting } from '../../shared/jobTypes'

// Lives at C:\Projects (same spot as 유튜브_시청기록_분석.xlsx and
// evi-mealtime-session-log.xlsx — see CLAUDE.md), not inside the repo.
// app.getAppPath() is the project root (C:\Projects\EVI) in dev, so its
// parent is C:\Projects. Assumes dev/unpackaged execution.
function jobFilePath(): string {
  return join(app.getAppPath(), '..', '부산_Java_채용공고.xlsx')
}

// Excel cells can hold plain strings or exceljs "rich text" runs — flatten
// either shape down to plain text (same approach as youtubeHistoryStore).
function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (typeof value === 'object' && 'richText' in value) {
    return (value as { richText: { text: string }[] }).richText.map((r) => r.text).join('')
  }
  return String(value)
}

// 지원링크 cells are Excel hyperlinks ({ text, hyperlink }) — prefer the
// actual href over the (possibly differently-formatted) display text.
function cellHyperlink(value: ExcelJS.CellValue): string {
  if (value != null && typeof value === 'object' && 'hyperlink' in value) {
    return String((value as { hyperlink: string }).hyperlink)
  }
  return cellText(value)
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// The 날짜 column is written by an external scraper on UTC time, not KST —
// compare against UTC-today, not local-today, or the match drifts off by a
// day for roughly the first 9 hours of each local day.
function todayUtcDateString(): string {
  const now = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`
}

interface RawPosting extends JobPosting {
  date: string
}

// Columns (see the sheet's header row): 날짜, 번호, 채용공고명, 회사명, 지역,
// 경력, 마감일, 지원링크. Only 날짜/채용공고명/지역/지원링크 are used here.
// Unlike youtubeHistoryStore, this is NOT cached — an external process
// refreshes this file itself (its own footer note says it runs a couple of
// times a day), so every open of the 채용공고 panel re-reads it fresh.
export async function getTodayJobPostings(): Promise<JobPosting[]> {
  if (!existsSync(jobFilePath())) return []

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(jobFilePath())
  const sheet = workbook.worksheets[0]
  if (!sheet) return []

  const rows: RawPosting[] = []
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return // header
    const date = cellText(row.getCell(1).value)
    if (!DATE_PATTERN.test(date)) return // skips the blank separator + footer note rows
    const title = cellText(row.getCell(3).value)
    const location = cellText(row.getCell(5).value)
    const applyUrl = cellHyperlink(row.getCell(8).value)
    if (!title || !applyUrl) return
    rows.push({ date, title, location, applyUrl })
  })

  // The day's scrape run(s) land at specific times, so UTC-today's rows
  // may not exist yet right after midnight UTC — fall back to the most
  // recent date already in the file instead of showing an empty panel
  // until the next run lands.
  const today = todayUtcDateString()
  const latestAvailableDate = rows
    .map((row) => row.date)
    .filter((date) => date <= today)
    .sort()
    .at(-1)
  if (!latestAvailableDate) return []

  return rows.filter((row) => row.date === latestAvailableDate).map(({ title, location, applyUrl }) => ({ title, location, applyUrl }))
}
