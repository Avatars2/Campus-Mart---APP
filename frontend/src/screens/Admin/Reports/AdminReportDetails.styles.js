import { StyleSheet, Platform } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    backgroundColor: '#007185',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: '#E0F2FE', marginTop: 2 },
  headerRight: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },

  content: { padding: 16, paddingBottom: 40 },

  // Main Card
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16,
    ...Platform.select({
      web: { boxShadow: '0px 2px 10px rgba(0,0,0,0.06)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
    }),
  },

  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  reasonBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 6,
  },
  reasonBadgeText: { fontSize: 12, fontWeight: '700' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 6,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },

  dateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20,
    justifyContent: 'flex-end',
  },
  dateText: { fontSize: 12, color: '#9CA3AF' },

  // Info columns
  infoRow: {
    flexDirection: 'row', gap: 16, marginBottom: 20,
    paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  infoColumn: { flex: 1 },
  infoIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  infoLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  infoValue: { fontSize: 16, color: '#111827', fontWeight: '600', marginBottom: 4 },

  roleBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginTop: 4,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },

  // Description
  descriptionSection: {
    marginBottom: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  descriptionText: { fontSize: 15, color: '#374151', lineHeight: 22, marginTop: 4 },

  // Proof
  proofSection: {
    paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  proofHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  proofCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6',
  },
  proofImageLarge: {
    width: '100%', height: 200, backgroundColor: '#E5E7EB',
  },
  proofMetaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 4, marginTop: 8,
  },
  proofFileName: { fontSize: 14, fontWeight: '600', color: '#3B82F6' },
  proofFileSize: { fontSize: 12, color: '#9CA3AF' },

  // Moderation
  moderationCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#E5E7EB',
    ...Platform.select({
      web: { boxShadow: '0px 2px 10px rgba(0,0,0,0.06)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
    }),
  },
  modHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20,
  },
  modIconWrapper: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  modTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  modDesc: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  modButtons: { flexDirection: 'row', gap: 12 },
  dismissBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6',
    borderWidth: 1, borderColor: '#E5E7EB', gap: 8,
  },
  dismissBtnText: { color: '#4B5563', fontWeight: '700', fontSize: 14 },
  resolveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, backgroundColor: '#3B82F6', gap: 8,
  },
  resolveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});

export default styles;
