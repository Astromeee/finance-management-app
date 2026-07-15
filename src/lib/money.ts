export const MAX_PKR_AMOUNT = 999_999_999_999

export function parseWholePkr(value: string | number) {
  const amount = typeof value === 'number' ? value : Number(value)
  return Number.isSafeInteger(amount) && amount > 0 && amount <= MAX_PKR_AMOUNT ? amount : null
}

export function isWholePkr(value: number) {
  return Number.isSafeInteger(value) && value >= 0 && value <= MAX_PKR_AMOUNT
}
