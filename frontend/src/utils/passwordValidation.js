/**
 * Shared password validation utility.
 * Rules: min 8 characters, at least one letter, one number, one special character.
 * @param {string} password
 * @returns {string|null} error message, or null if valid
 */
export function validatePassword(password) {
  if (!password || password.length < 8)
    return 'Password must be at least 8 characters long.';
  if (!/[a-zA-Z]/.test(password))
    return 'Password must contain at least one letter.';
  if (!/[0-9]/.test(password))
    return 'Password must contain at least one number.';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
    return 'Password must contain at least one special character.';
  return null;
}
