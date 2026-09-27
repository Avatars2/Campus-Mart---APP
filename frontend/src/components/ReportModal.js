import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import client from '../api/client';

export default function ReportModal({ visible, onClose, targetId, targetType, targetName }) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProofImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error picking image', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const ITEM_REASONS = ['Counterfeit/Fake', 'Prohibited Item', 'Inaccurate Description', 'Scam', 'Other'];
  const USER_REASONS = ['Harassment/Abuse', 'Scam/Fraud', 'Spam', 'Inappropriate Profile', 'Other'];
  const reasons = targetType === 'item' ? ITEM_REASONS : USER_REASONS;

  const handleSubmit = async () => {
    if (!reason) {
      Alert.alert('Error', 'Please select a reason for reporting.');
      return;
    }

    setLoading(true);
    try {
      let formData = new FormData();
      formData.append('target_type', targetType);
      formData.append('target_id', targetId);
      formData.append('reason', reason);
      formData.append('description', description.trim());
      
      if (proofImage) {
        const localUri = proofImage;
        const filename = localUri.split('/').pop() || 'proof.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? 'image/' + match[1] : 'image/jpeg';
        
        if (Platform.OS === 'web') {
          const res = await fetch(localUri);
          const blob = await res.blob();
          formData.append('proof_image', blob, filename);
        } else {
          formData.append('proof_image', { uri: localUri, name: filename, type });
        }
      }

      await client.post('/reports', formData, {
        headers: Platform.OS === 'web' ? {} : { 'Content-Type': 'multipart/form-data' }
      });
      
      Alert.alert('Report Submitted', 'Thank you for your report. Our team will review it shortly.');
      setReason('');
      setDescription('');
      setProofImage(null);
      onClose();
    } catch (error) {
      console.error('Submit report error:', error);
      Alert.alert('Error', 'Failed to submit the report. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Report {targetType === 'item' ? 'Listing' : 'User'}</Text>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Ionicons name="close" size={24} color="#697386" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.targetText}>
              You are reporting: <Text style={styles.targetName}>{targetName}</Text>
            </Text>

            <Text style={styles.label}>Select a Reason <Text style={{ color: '#DC2626' }}>*</Text></Text>
            <View style={styles.reasonsContainer}>
              {reasons.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.reasonChip, reason === r && styles.reasonChipActive]}
                  onPress={() => setReason(r)}
                  disabled={loading}
                >
                  <Text style={[styles.reasonChipText, reason === r && styles.reasonChipTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Additional Details</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Provide any additional context or evidence to help our review team..."
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
              editable={!loading}
              textAlignVertical="top"
            />

            <View style={{ marginBottom: 16 }}>
              <Text style={styles.label}>Proof / Evidence (Optional)</Text>
              {proofImage ? (
                <View style={{ position: 'relative', alignSelf: 'flex-start', marginTop: 8 }}>
                  <Image source={{ uri: proofImage }} style={{ width: 100, height: 100, borderRadius: 8 }} />
                  <TouchableOpacity 
                    style={{ position: 'absolute', top: -8, right: -8, backgroundColor: 'white', borderRadius: 12 }}
                    onPress={() => setProofImage(null)}
                  >
                    <Ionicons name="close-circle" size={24} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8, marginTop: 8 }}
                  onPress={pickImage}
                >
                  <Ionicons name="image-outline" size={20} color="#4B5563" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#4B5563', fontWeight: '500' }}>Attach Screenshot/Image</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, (!reason || loading) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!reason || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
