const COLLEGE_EMAIL_DOMAIN = '@bvmengineering.ac.in';

export const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

export const isAllowedCollegeEmail = (email) => {
  const normalizedEmail = normalizeEmail(email);
  const adminEmail = normalizeEmail(process.env.EXPO_PUBLIC_ADMIN_EMAIL);
  return normalizedEmail.endsWith(COLLEGE_EMAIL_DOMAIN) || (adminEmail && normalizedEmail === adminEmail);
};

export const validatePassword = (password) => (
  typeof password === 'string'
  && password.length >= 8
  && /[A-Za-z]/.test(password)
  && /\d/.test(password)
);

export const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return process.env.JWT_SECRET;
};

export const validateRegistrationInput = ({ full_name, email, password, phone, student_id }) => {
  const normalizedEmail = normalizeEmail(email);
  if (!full_name?.trim() || !normalizedEmail || !password || !phone?.trim() || !student_id?.trim()) {
    return 'Name, college email, password, phone, and student ID are required.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return 'Please provide a valid email address.';
  }
  if (!isAllowedCollegeEmail(normalizedEmail)) {
    return 'Please use an approved college email address.';
  }
  if (!validatePassword(password)) {
    return 'Password must be at least 8 characters and contain a letter and a number.';
  }
  return null;
};