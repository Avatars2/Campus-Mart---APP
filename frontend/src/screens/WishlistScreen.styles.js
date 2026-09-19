import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#0F1111' },
  
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
    backgroundColor: '#FFD814', 
    borderRadius: 100, 
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cartBtnText: {
    color: '#0F1111',
    fontSize: 14,
    fontWeight: '400',
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
    backgroundColor: '#F0F2F2',
    paddingVertical: 12,
    borderRadius: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D5D9D9',
  },
  noButtonText: {
    color: '#0F1111',
    fontSize: 14,
  },
  yesButton: {
    flex: 1,
    backgroundColor: '#FFD814',
    paddingVertical: 12,
    borderRadius: 100,
    alignItems: 'center',
  },
  removeYesButton: {
    flex: 1,
    backgroundColor: '#B12704',
    paddingVertical: 12,
    borderRadius: 100,
    alignItems: 'center',
  },
  yesButtonText: {
    color: '#0F1111',
    fontSize: 14,
  },
  removeYesButtonText: {
    color: '#FFF',
    fontSize: 14,
  },
  
  // Empty State
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#565959' }
});
