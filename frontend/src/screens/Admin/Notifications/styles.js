import { StyleSheet, Platform } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#1E3A8A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 36,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: -20,
    ...Platform.select({
      web: { boxShadow: '0px 2px 10px rgba(0,0,0,0.06)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#1E293B',
    padding: 0,
  },

  // Filter Tabs
  tabsWrapper: {
    marginTop: 14,
    marginBottom: 6,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  // List
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.04)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  audienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  audienceBadgeAll: {
    backgroundColor: '#EFF6FF',
  },
  audienceBadgeSpecific: {
    backgroundColor: '#FAF5FF',
  },
  audienceTextAll: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  audienceTextSpecific: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },
  cardDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 10,
  },

  // Attachment Chip in Card
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    alignSelf: 'flex-start',
    gap: 6,
  },
  attachmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
    maxWidth: 220,
  },
  attachmentSizeText: {
    fontSize: 11,
    color: '#2563EB',
  },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 4,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    gap: 4,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },

  // Delete Confirmation Modal
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 8px 30px rgba(0,0,0,0.15)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  confirmModalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  confirmModalMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  confirmDeleteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 30,
  },

  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
    ...Platform.select({
      web: { boxShadow: '0px 4px 16px rgba(37,99,235,0.35)' },
      default: {
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
      },
    }),
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

