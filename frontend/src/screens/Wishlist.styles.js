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
  
  // Flat list item
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  itemImageContainer: {
    width: 120,
    height: 120,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemImage: { 
    width: '100%', 
    height: '100%', 
    resizeMode: 'contain' 
  },
  
  // Right side details
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
    color: '#007600', // Amazon green for in-stock
    fontSize: 12, 
    marginBottom: 8,
  },
  unavailableText: { 
    color: '#B12704', // Amazon dark red
    fontSize: 12, 
    marginBottom: 8,
  },
  
  // Actions
  actionContainer: {
    marginTop: 'auto',
  },
  cartBtn: {
    backgroundColor: '#007185',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#007185',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  cartBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledBtn: { 
    backgroundColor: '#E5E7EB' 
  },
  deleteBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#F0F2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D5D9D9',
  },
  deleteBtnText: {
    color: '#0F1111',
    fontSize: 13,
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
  },
  conditionBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  
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
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  removeConfirmationIcon: {
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
  yesButton: {
    flex: 1,
    backgroundColor: '#007185',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#007185',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
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
  yesButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  removeYesButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  
  // Empty State
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#565959' }
});
