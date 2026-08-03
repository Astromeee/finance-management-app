const requestEvent = 'pocket-ledger:install-request'

export function requestPwaInstall() {
  window.dispatchEvent(new Event(requestEvent))
}

export { requestEvent }
