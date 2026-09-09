import { StyleSheet, Platform } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1F36' },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1F36',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 15,
    color: '#1A1F36',
    fontWeight: '500',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 13,
    color: '#697386',
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1F36',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1F36',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0052CC',
  },
  deliveryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deliveryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1F36',
    marginBottom: 4,
  },
  deliverySubtitle: {
    fontSize: 13,
    color: '#697386',
    lineHeight: 18,
  },
  paymentCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  paymentCardActive: {
    borderColor: '#0052CC',
    backgroundColor: '#F0F5FF',
  },
  paymentIcon: {
    width: 40,
    alignItems: 'center',
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1F36',
    marginBottom: 4,
  },
  paymentTitleActive: {
    color: '#0052CC',
  },
  paymentSubtitle: {
    fontSize: 13,
    color: '#697386',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C1C7D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: '#0052CC',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0052CC',
  },
  badge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  footer: {
    backgroundColor: '#FFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  footerTotal: {
    flex: 1,
  },
  footerTotalLabel: {
    fontSize: 13,
    color: '#697386',
    marginBottom: 2,
  },
  footerTotalAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1F36',
  },
  confirmButton: {
    backgroundColor: '#0052CC',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 150,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  }
});
