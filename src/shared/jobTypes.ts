// Shared between main (Excel read) and renderer (display) for the
// "채용공고" menu item — kept minimal, mirrors youtubeTypes.ts.
export interface JobPosting {
  title: string
  location: string
  applyUrl: string
}
