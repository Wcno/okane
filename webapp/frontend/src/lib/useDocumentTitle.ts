import { useEffect } from 'react'

const APP_NAME = 'Okane'

/** The tab title of a screen: its name, then the app's (WCAG 2.4.2). */
export const documentTitleOf = (screen: string) => `${screen} · ${APP_NAME}`

/** Names the page for the browser tab and the history while the screen is shown. */
export function useDocumentTitle(screen: string) {
  useEffect(() => {
    const previous = document.title
    document.title = documentTitleOf(screen)
    return () => {
      document.title = previous
    }
  }, [screen])
}
