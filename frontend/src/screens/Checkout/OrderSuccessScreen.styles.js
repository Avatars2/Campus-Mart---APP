import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0052CC', // Theme color header background
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#F7F9FC',
    paddingBottom: 20,
  },
  successHeader: {
    backgroundColor: '#0052CC',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4ade80',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#E0E7FF',
  },
  invoiceCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: -30, // Overlap the header
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1F36',
    marginBottom: 16,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  invoiceLabel: {
    fontSize: 14,
    color: '#697386',
  },
  invoiceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1F36',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
    borderStyle: 'dashed',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1F36',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0052CC',
  },
  instructionCard: {
    backgroundColor: '#E0E7FF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0052CC',
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  footer: {
    backgroundColor: '#FFF',
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  primaryButton: {
    backgroundColor: '#0052CC',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '700',
  }
});
