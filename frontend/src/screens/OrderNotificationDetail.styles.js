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
  
  errorText: { color: '#565959', textAlign: 'center', fontSize: 15, marginTop: 12, marginBottom: 20 },
  backButton: { backgroundColor: '#FFD814', borderRadius: 8, paddingHorizontal: 22, paddingVertical: 12, borderWidth: 1, borderColor: '#FCD200' },
  backButtonText: { color: '#0F1111', fontWeight: '400', fontSize: 15 },
});
