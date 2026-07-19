const PASSWORD_MIN_LENGTH = 6

export function passwordValidationMessage(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`
  if (!/[A-Z]/.test(password)) return 'Add at least one uppercase letter.'
  if (!/[0-9]/.test(password)) return 'Add at least one number.'
  return null
}

export const passwordRequirements = 'At least 6 characters with one uppercase letter and one number.'
