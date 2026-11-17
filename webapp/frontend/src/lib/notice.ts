/** The confirmation a list screen shows after a change; it travels in the navigation state. */
export interface ScreenNotice {
  notice: string
}

/** The notice carried by the navigation state of a screen, if any. */
export function noticeFrom(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) return null
  const { notice } = state as Partial<ScreenNotice>
  return typeof notice === 'string' ? notice : null
}
