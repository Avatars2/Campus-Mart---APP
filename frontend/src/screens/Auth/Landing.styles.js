import { StyleSheet, Dimensions, Platform } from 'react-native';
import { colors } from '../../theme/colors';

const { width, height } = Dimensions.get('window');

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  // Top gradient-like hero
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 40 : 60,
    paddingBottom: 40, // Increased bottom padding to prevent overlap
  },
  logoContainer: {
    width: 110,
    height: 110,
    backgroundColor: 'transparent', // Removing white background so the icon itself acts as the logo
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28, // Matches typical icon radius
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  // Bottom white card
  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: Platform.OS === 'ios' ? 44 : 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 20,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  builtForBadge: {
    backgroundColor: colors.brandSoft,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  builtForText: {
    color: colors.brandDark,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  collegeName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  location: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.subtle,
    textAlign: 'center',
    marginBottom: 28,
    fontWeight: '400',
  },
  // Features List
  featuresList: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: colors.canvas,
    padding: 14,
    borderRadius: 16,
  },
  featureIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  featureDesc: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '500',
  },
  // Actions
  actionContainer: {
    width: '100%',
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.line,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
});
