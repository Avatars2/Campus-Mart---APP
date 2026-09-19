import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  
  // Header
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
  headerTitle: { 
    fontSize: 22, 
    fontWeight: '900', 
    color: '#0F1111' 
  },

  searchWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F2',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D5D9D9',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#0F1111',
  },
  
  listContainer: {
    paddingBottom: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  conversationDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F1111',
  },
  time: {
    fontSize: 12,
    color: '#565959',
  },
  itemName: {
    fontSize: 13,
    color: '#007185',
    marginBottom: 4,
    fontWeight: '500',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  lastMessage: {
    fontSize: 14,
    color: '#565959',
    flex: 1,
  },
  unreadText: {
    fontWeight: '700',
    color: '#0F1111',
  },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007185', // Amazon Link Blue / WhatsApp Blue tint
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#565959',
  },
});
