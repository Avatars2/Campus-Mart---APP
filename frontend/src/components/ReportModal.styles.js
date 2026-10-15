import { StyleSheet, Platform } from 'react-native';

export default StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1F36',
  },
  targetText: {
    fontSize: 15,
    color: '#4F566B',
    marginBottom: 24,
  },
  targetName: {
    fontWeight: '700',
    color: '#1A1F36',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1F36',
    marginBottom: 12,
  },
  requiredStar: {
    color: '#DC2626',
  },
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  reasonChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reasonChipActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
  },
  reasonChipText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  reasonChipTextActive: {
    color: '#DC2626',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1A1F36',
    minHeight: 120,
    marginBottom: 24,
  },
  proofSection: {
    marginBottom: 16,
  },
  proofPreviewWrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  proofImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeProofButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  attachIcon: {
    marginRight: 8,
  },
  attachButtonText: {
    color: '#4B5563',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
