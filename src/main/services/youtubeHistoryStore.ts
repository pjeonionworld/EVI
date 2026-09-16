import { existsSync } from 'fs'
import { mkdir } from 'fs/promises'
import { dirname, join } from 'path'
import { app } from 'electron'
import ExcelJS from 'exceljs'

export interface WatchRecord {
  title: string
  channel: string
  channelUrl: string
  videoUrl: string
  watchedAt: string // "YYYY-MM-DD HH:mm:ss"
  source: 'seed' | 'mealtime'
}

// One video opened during a 측정시작~측정끝 session — used only to build
// mealtime-session-log.xlsx rows, not part of the WatchRecord/scoring model.
export interface MealtimeSessionVideo {
  title: string
  channel: string
  videoUrl: string
}

// Seed data: a one-time export/analysis of past YouTube history, copied in
// as-is (see data/youtube/ — gitignored, personal data). Mealtime log: an
// EVI-managed file this app appends to itself — not wired to any recorder
// yet, but the schema/file exist now so the future meal-time tracking
// feature (see CLAUDE.md "Next Priorities") has somewhere to write to.
const SEED_SHEET_NAME = '원본데이터'
const MEALTIME_SHEET_NAME = '식사시간_시청기록'
const ROW_HEADERS = ['날짜', '시간(시)', '요일', '제목', '채널', '채널URL', '영상URL', '시청일시']

// Separate, human-facing log of each measured session itself (start/end
// time + whatever was opened during it) — not read back into scoring, just
// a record for the user to look at. One row per video opened in the
// session, or one blank-video row if none were.
const SESSION_SHEET_NAME = '측정세션기록'
const SESSION_ROW_HEADERS = ['측정시작시간', '측정끝시간', '측정시간(분)', '제목', '채널', '영상URL', '카테고리']

function dataDir(): string {
  return join(app.getAppPath(), 'data', 'youtube')
}

function seedFilePath(): string {
  return join(dataDir(), 'seed-watch-history.xlsx')
}

function mealtimeFilePath(): string {
  return join(dataDir(), 'mealtime-watch-log.xlsx')
}

// Kept outside data/ (and so outside .gitignore's reach) on purpose — same
// spirit as the seed file living at C:\Projects\유튜브_시청기록_분석.xlsx
// (see CLAUDE.md): app.getAppPath() is the project root (C:\Projects\EVI)
// in dev, so its parent is C:\Projects regardless of whose machine this
// runs on. This assumes dev/unpackaged execution — packaging (not yet
// implemented) would need this revisited, since app.getAppPath() points
// inside the app bundle there instead.
function sessionLogFilePath(): string {
  return join(app.getAppPath(), '..', 'evi-mealtime-session-log.xlsx')
}

// Excel cells can hold plain strings or exceljs "rich text" runs (the tool
// that generated the seed file used rich text for emoji/bold styling inside
// titles) — flatten either shape down to plain text.
function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (typeof value === 'object' && 'richText' in value) {
    return (value as { richText: { text: string }[] }).richText.map((r) => r.text).join('')
  }
  return String(value)
}

function readSheetRecords(worksheet: ExcelJS.Worksheet, source: WatchRecord['source']): WatchRecord[] {
  const records: WatchRecord[] = []
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return // header
    const title = cellText(row.getCell(4).value)
    const videoUrl = cellText(row.getCell(7).value)
    if (!title || !videoUrl) return
    records.push({
      title,
      channel: cellText(row.getCell(5).value),
      channelUrl: cellText(row.getCell(6).value),
      videoUrl,
      watchedAt: cellText(row.getCell(8).value),
      source
    })
  })
  return records
}

async function ensureMealtimeFile(): Promise<void> {
  if (existsSync(mealtimeFilePath())) return
  await mkdir(dataDir(), { recursive: true })
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(MEALTIME_SHEET_NAME)
  sheet.addRow(ROW_HEADERS)
  await workbook.xlsx.writeFile(mealtimeFilePath())
}

// Both files are personal-scale (tens of thousands of rows at most), so
// they're only parsed once per app run and cached — not re-read on every
// recommendation request.
let cache: WatchRecord[] | null = null

async function loadAll(): Promise<WatchRecord[]> {
  const records: WatchRecord[] = []

  if (existsSync(seedFilePath())) {
    const seedWorkbook = new ExcelJS.Workbook()
    await seedWorkbook.xlsx.readFile(seedFilePath())
    const seedSheet = seedWorkbook.getWorksheet(SEED_SHEET_NAME)
    if (seedSheet) records.push(...readSheetRecords(seedSheet, 'seed'))
  }

  await ensureMealtimeFile()
  const mealtimeWorkbook = new ExcelJS.Workbook()
  await mealtimeWorkbook.xlsx.readFile(mealtimeFilePath())
  const mealtimeSheet = mealtimeWorkbook.getWorksheet(MEALTIME_SHEET_NAME)
  if (mealtimeSheet) records.push(...readSheetRecords(mealtimeSheet, 'mealtime'))

  return records
}

export async function getWatchRecords(): Promise<WatchRecord[]> {
  if (!cache) {
    cache = await loadAll()
  }
  return cache
}

// Not called anywhere yet — reserved for the future meal-time tracking
// feature, which will record a video here each time one is watched during
// a tracked meal window.
export async function appendMealtimeWatch(record: Omit<WatchRecord, 'source'>): Promise<void> {
  await ensureMealtimeFile()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(mealtimeFilePath())
  const sheet = workbook.getWorksheet(MEALTIME_SHEET_NAME)
  if (!sheet) return

  const watchedDate = record.watchedAt.slice(0, 10)
  const hour = record.watchedAt.slice(11, 13)
  const weekday = new Date(record.watchedAt.replace(' ', 'T')).toLocaleDateString('ko-KR', { weekday: 'short' })

  sheet.addRow([
    watchedDate,
    hour,
    weekday,
    record.title,
    record.channel,
    record.channelUrl,
    record.videoUrl,
    record.watchedAt
  ])
  await workbook.xlsx.writeFile(mealtimeFilePath())
  cache = null // next getWatchRecords() call picks up the new row
}

async function ensureSessionLogFile(): Promise<void> {
  if (existsSync(sessionLogFilePath())) return
  await mkdir(dirname(sessionLogFilePath()), { recursive: true })
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(SESSION_SHEET_NAME)
  sheet.addRow(SESSION_ROW_HEADERS)
  await workbook.xlsx.writeFile(sessionLogFilePath())
}

// startedAt/endedAt are "YYYY-MM-DD HH:mm:ss" strings, not real Date cells
// in the sheet — plain arithmetic here instead of an in-sheet Excel formula,
// since Excel can't subtract two text timestamps on its own.
function diffMinutes(startedAt: string, endedAt: string): number {
  const start = new Date(startedAt.replace(' ', 'T')).getTime()
  const end = new Date(endedAt.replace(' ', 'T')).getTime()
  return Math.round(((end - start) / (1000 * 60)) * 10) / 10
}

// Called once per 측정시작~측정끝 session, when 측정끝 is pressed — writes
// one row per video opened during the session (or a single row with blank
// video fields if none were), all sharing that session's start/end time and
// duration. 카테고리 is left blank; there's no video-category data source
// wired up yet.
export async function appendMealtimeSession(
  startedAt: string,
  endedAt: string,
  videos: MealtimeSessionVideo[]
): Promise<void> {
  await ensureSessionLogFile()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(sessionLogFilePath())
  const sheet = workbook.getWorksheet(SESSION_SHEET_NAME)
  if (!sheet) return

  const durationMinutes = diffMinutes(startedAt, endedAt)
  const rows = videos.length > 0 ? videos : [{ title: '', channel: '', videoUrl: '' }]
  for (const video of rows) {
    sheet.addRow([startedAt, endedAt, durationMinutes, video.title, video.channel, video.videoUrl, ''])
  }
  await workbook.xlsx.writeFile(sessionLogFilePath())
}
