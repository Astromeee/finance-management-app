import { isNativeApp } from './platform'

const requestEvent = 'pocket-ledger:install-request'

export function requestPwaInstall() {
  if (isNativeApp) return
  window.dispatchEvent(new Event(requestEvent))
}

export { requestEvent }
