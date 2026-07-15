const PASSWORD_MIN_LENGTH = 12

export function passwordValidationMessage(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`
  if (!/[a-z]/.test(password)) return 'Add at least one lowercase letter.'
  if (!/[A-Z]/.test(password)) return 'Add at least one uppercase letter.'
  if (!/[0-9]/.test(password)) return 'Add at least one number.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Add at least one symbol.'
  return null
}

export const passwordRequirements = 'At least 12 characters with uppercase, lowercase, a number, and a symbol.'
