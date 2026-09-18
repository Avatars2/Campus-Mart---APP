import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  // Header
  headerContainer: {
    alignItems: 'center',
    marginBottom: 28,
    width: '100%',
  },
  logoContainer: {
    width: 108,
    height: 108,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  // Form Card
  formContainer: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  // Inputs — borderColor & backgroundColor animated via Animated.View interpolate
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1.5,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    fontWeight: '500',
    paddingVertical: 0,
  },
  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
    flex: 1,
    lineHeight: 18,
  },
  // OTP / Forgot link
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 18,
    marginTop: 2,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  forgotLinkText: {
    color: colors.brand,
    fontWeight: '700',
    fontSize: 13,
  },
  // Sign In button
  primaryButton: {
    backgroundColor: colors.brand,
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Sign Up link
  switchLinkContainer: {
    marginTop: 22,
    alignItems: 'center',
    paddingBottom: 2,
  },
  switchLinkText: {
    fontSize: 14,
    color: colors.muted,
  },
  switchLinkTextBold: {
    color: colors.ink,
    fontWeight: '700',
  },
  // Back button
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    padding: 12,
  },
  backButtonText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '600',
  },
});
