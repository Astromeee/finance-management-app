import { App } from '@capacitor/app'

/** Preserve the existing history-based sheet dismissal and page navigation. */
export async function installNativeNavigation() {
  await App.addListener('backButton', ({ canGoBack }) => {
    const atRoot = ['/app', '/app/', '/login', '/'].includes(window.location.pathname)
    if (window.history.state?.pocketOverlay || (!atRoot && canGoBack)) {
      window.history.back()
    } else {
      void App.minimizeApp()
    }
  })
}
