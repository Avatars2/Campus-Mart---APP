import { StyleSheet, Platform } from 'react-native';

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#0F1111' },
  backButton: { position: 'absolute', left: 20, bottom: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  
  // Cart Items
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  itemImageContainer: {
    width: 100,
    height: 100,
    marginRight: 12,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  itemImage: { 
    width: '100%', 
    height: '100%', 
    resizeMode: 'contain' 
  },
  itemDetails: { 
    flex: 1, 
    justifyContent: 'flex-start' 
  },
  itemName: { 
    fontSize: 16, 
    color: '#0F1111', 
    marginBottom: 4,
    lineHeight: 22,
  },
  itemPrice: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#0F1111',
    marginBottom: 4,
  },
  stockText: { 
    color: '#007600',
    fontSize: 12, 
    marginBottom: 8,
  },
  unavailableText: { 
    color: '#B12704',
    fontSize: 12, 
    marginBottom: 8,
  },
  
  // Badges
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  conditionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F97316',
    alignSelf: 'flex-start',
    marginRight: 6,
  },
  conditionBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Actions row
  itemActionsRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 8,
    flexWrap: 'wrap',
  },
  quantityControl: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F0F2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D5D9D9',
    overflow: 'hidden',
    marginRight: 16,
    marginBottom: 8,
  },
  quantityButton: { 
    paddingHorizontal: 12, 
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityValue: { 
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F1111',
  },
  
  secondaryActions: { 
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  textAction: { 
    paddingVertical: 4,
  },
  textActionSeparator: {
    color: '#D5D9D9',
    marginHorizontal: 8,
  },
  textActionLabel: { 
    color: '#007185', 
    fontSize: 13,
  },

  // Saved for Later Section
  savedSection: { 
    marginTop: 20,
    borderTopWidth: 8,
    borderTopColor: '#F3F4F6',
  },
  savedSectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  savedSectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#0F1111', 
    marginLeft: 8 
  },
  savedCard: { 
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  savedImageContainer: {
    width: 80,
    height: 80,
    marginRight: 12,
  },
  savedImage: { 
    width: '100%', 
    height: '100%', 
    resizeMode: 'contain' 
  },
  savedDetails: { 
    flex: 1, 
    justifyContent: 'flex-start' 
  },
  moveToCartButton: {
    backgroundColor: '#007185',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  moveToCartText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Footer / Checkout Area
  footer: { 
    padding: 16, 
    backgroundColor: '#FFF', 
    borderTopWidth: 1, 
    borderTopColor: '#E5E7EB',
  },
  totalRow: { 
    flexDirection: 'row', 
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  totalLabel: { 
    fontSize: 18, 
    color: '#0F1111',
    marginRight: 8,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#007185',
  },
  checkoutBtn: {
    backgroundColor: '#007185',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#007185',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Empty State
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#565959' },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationModal: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
  },
  confirmationIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F1111',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmationMessage: {
    fontSize: 14,
    color: '#565959',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmationActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  noButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noButtonText: {
    color: '#475569',
    fontSize: 14.5,
    fontWeight: '700',
  },
  removeYesButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  removeYesButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
});
