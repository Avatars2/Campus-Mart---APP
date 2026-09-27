import { StyleSheet, Platform } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1F36',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginTop: 15,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#1A1F36',
  },
  listContainer: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    padding: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    marginRight: 12,
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1F36',
    flex: 1,
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0052CC',
  },
  sellerName: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  unpublishButton: {
    backgroundColor: '#FEF3C7',
  },
  unpublishText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '600',
  },
  publishButton: {
    backgroundColor: '#E0F2FE',
  },
  publishText: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  deleteText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: '#DC2626',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#0052CC',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    marginTop: 40,
  },
});
