import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#FFFFFF' },
  
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    paddingTop: 50, 
    paddingBottom: 15, 
    paddingHorizontal: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB' 
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#0F1111' },
  
  content: { paddingBottom: 32 }, // Removed side padding for edge-to-edge layout
  
  notificationBanner: { 
    flexDirection: 'row', 
    backgroundColor: '#F7FAFA', 
    padding: 16, 
    borderBottomWidth: 4, 
    borderBottomColor: '#F3F4F6' 
  },
  bannerText: { flex: 1, marginLeft: 10 },
  notificationTitle: { fontSize: 16, fontWeight: '700', color: '#0F1111', marginBottom: 4 },
  notificationBody: { color: '#565959', fontSize: 14, lineHeight: 20 },
  
  statusCard: { 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderBottomWidth: 4, 
    borderBottomColor: '#F3F4F6' 
  },
  statusLabel: { color: '#565959', fontSize: 13, marginBottom: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusValue: { fontSize: 17, fontWeight: '700', marginLeft: 8 },
  
  card: { 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderBottomWidth: 4, 
    borderBottomColor: '#F3F4F6' 
  },
  cardTitle: { color: '#0F1111', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  
  itemRow: { flexDirection: 'row', alignItems: 'flex-start' },
  itemImage: { width: 80, height: 80, borderRadius: 4, backgroundColor: '#F3F4F6', resizeMode: 'contain' },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { color: '#0F1111', fontSize: 16, fontWeight: '400', marginBottom: 6, lineHeight: 22 },
  
  personName: { color: '#0F1111', fontSize: 15, fontWeight: '700', marginBottom: 6 },
  detailText: { color: '#565959', fontSize: 14, lineHeight: 22, marginBottom: 2 },
  detailLabel: { color: '#0F1111', fontWeight: '600' },
  
  amount: { color: '#B12704', fontSize: 18, fontWeight: '700', marginTop: 8 },
  
  // Role-Based Person Card & Contact Buttons
  personHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  personAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E2E8F0', marginRight: 12 },
  personInfoWrap: { flex: 1 },
  contactRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  callBtn: { backgroundColor: '#007185' },
  chatBtn: { backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BAE6FD' },
  callBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  chatBtnText: { color: '#0369A1', fontWeight: '700', fontSize: 14 },

  // Enhanced Item Tags & Badges
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4, marginBottom: 6 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#EFF6FF' },
  typeBadgeText: { fontSize: 12, fontWeight: '700', color: '#1D4ED8' },
  conditionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#FEF3C7' },
  conditionBadgeText: { fontSize: 12, fontWeight: '600', color: '#B45309' },

  // Dashboard Navigation Button
  actionSecondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#007185',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  actionSecondaryBtnText: { color: '#007185', fontWeight: '700', fontSize: 14 },

  errorText: { color: '#565959', textAlign: 'center', fontSize: 15, marginTop: 12, marginBottom: 20 },
  backButton: { backgroundColor: '#007185', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, shadowColor: '#007185', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  backButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
