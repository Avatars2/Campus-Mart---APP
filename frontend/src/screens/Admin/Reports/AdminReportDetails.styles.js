import { StyleSheet, Platform } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    position: 'absolute', left: 20, bottom: 20, width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#0F1111' },
  content: { padding: 16 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 16,
  },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeText: { fontSize: 15, color: '#4B5563', fontWeight: '600' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  infoGroup: { marginBottom: 20 },
  label: { fontSize: 13, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  targetName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  reasonText: { fontSize: 16, fontWeight: '600', color: '#DC2626' },
  descriptionText: { fontSize: 15, color: '#374151', lineHeight: 22, marginTop: 4 },
  inspectBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#E0E7FF', alignSelf: 'flex-start', borderRadius: 8 },
  inspectBtnText: { color: '#0052CC', fontWeight: '600', marginLeft: 6, fontSize: 13 },
  footerGroup: { marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  dateText: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
  moderationCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  modTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  modDesc: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  modButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modBtn: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }
});

export default styles;
