export type StrengthLevel = 'bad' | 'better' | 'good' | 'strong'

export interface StrengthCheck {
  label: string
  met: boolean
}

export interface PasswordLevelMeta {
  label: 'Bad' | 'Better' | 'Good' | 'Strong'
  color: string
  bg: string
  border: string
}

export function hasMinLength(password: string): boolean {
  return password.length >= 10
}

export function hasLetter(password: string): boolean {
  return /[A-Za-z]/.test(password)
}

export function hasNumber(password: string): boolean {
  return /[0-9]/.test(password)
}

export function hasSpecial(password: string): boolean {
  return /[^A-Za-z0-9]/.test(password)
}

export function getChecks(password: string): StrengthCheck[] {
  return [
    { label: 'At least 10 characters', met: hasMinLength(password) },
    { label: 'At least one letter', met: hasLetter(password) },
    { label: 'At least one number', met: hasNumber(password) },
    { label: 'Contains special character (optional)', met: hasSpecial(password) },
  ]
}

export function getPasswordLevel(password: string): PasswordLevelMeta | null {
  if (!password) return null

  const minLen = hasMinLength(password)
  const letter = hasLetter(password)
  const num = hasNumber(password)
  const special = hasSpecial(password)

  // Good: meets all 3 mandatory university criteria (10+ chars, letter, number)
  if (minLen && letter && num) {
    if (password.length >= 12 && special) {
      return {
        label: 'Strong',
        color: '#0d9488',
        bg: '#f0fdfa',
        border: '#99f6e4',
      }
    }
    return {
      label: 'Good',
      color: '#16a34a',
      bg: '#f0fdf4',
      border: '#bbf7d0',
    }
  }

  // Better: getting closer (e.g. 8+ characters or meets 2 criteria)
  const metCount = [minLen, letter, num].filter(Boolean).length
  if (password.length >= 8 || metCount >= 2) {
    return {
      label: 'Better',
      color: '#d97706',
      bg: '#fffbeb',
      border: '#fde68a',
    }
  }

  // Bad: short or missing essential requirements
  return {
    label: 'Bad',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
  }
}

export function validatePassword(
  newPassword: string,
  confirmPassword?: string,
): {
  valid: boolean
  errors: { new_password?: string; confirm_password?: string }
} {
  const errors: { new_password?: string; confirm_password?: string } = {}

  if (!newPassword) {
    errors.new_password = 'New password is required'
  } else if (!hasMinLength(newPassword)) {
    errors.new_password = 'Password must be at least 10 characters'
  } else if (!hasLetter(newPassword)) {
    errors.new_password = 'Password must contain at least one letter'
  } else if (!hasNumber(newPassword)) {
    errors.new_password = 'Password must contain at least one number'
  }

  if (confirmPassword !== undefined) {
    if (!confirmPassword) {
      errors.confirm_password = 'Please confirm your new password'
    } else if (newPassword !== confirmPassword) {
      errors.confirm_password = 'Passwords do not match'
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
