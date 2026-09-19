import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F1111',
    marginBottom: 4,
  },
  markAllText: {
    color: '#007185', // Amazon link blue
    fontSize: 13,
    marginBottom: 6,
  },
  listContainer: {
    paddingBottom: 20, // Replaced padding: 10 with paddingBottom to allow full width borders
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'flex-start', // Align to top for better text flow
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  unreadCard: {
    backgroundColor: '#F7FAFA', // Very subtle light gray/blue tint for unread
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 16,
    color: '#0F1111',
    marginBottom: 4,
    lineHeight: 22,
  },
  unreadText: {
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    color: '#565959',
    marginBottom: 6,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    color: '#565959',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E77600', // Amazon orange
    marginLeft: 8,
    marginTop: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#565959',
  },
});
