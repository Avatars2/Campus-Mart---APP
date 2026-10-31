import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import client from '../api/client';
import styles from './ReportModal.styles';

export default function ReportModal({
  visible,
  onClose,
  targetId,
  targetType = 'user',
  targetName,
  allowSelectUser = false,
  onReportSubmitted,
}) {
  const isSelectable = allowSelectUser || !targetId;

  const [selectedStudent, setSelectedStudent] = useState(
    targetId ? { _id: targetId, full_name: targetName } : null
  );
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reasons, setReasons] = useState([]);
  const [loadingReasons, setLoadingReasons] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchReasons();
      if (targetId) {
        setSelectedStudent({ _id: targetId, full_name: targetName });
      } else if (isSelectable) {
        setSelectedStudent(null);
        setSearchQuery('');
        fetchCandidates('');
      }
    } else {
      setReason('');
      setDescription('');
      setProofImage(null);
      setSearchQuery('');
      if (!targetId) {
        setSelectedStudent(null);
      }
    }
  }, [visible, targetType, targetId, targetName, isSelectable]);

  const fetchReasons = async () => {
    setLoadingReasons(true);
    try {
      const response = await client.get('/report-reasons');
      if (Array.isArray(response.data) && response.data.length > 0) {
        setReasons(response.data.map((item) => item.title));
      } else {
        setReasons(['Harassment/Abuse', 'Scam/Fraud', 'Spam', 'Inappropriate Profile', 'Other']);
      }
    } catch (error) {
      console.log('Failed to fetch report reasons, using defaults:', error);
      setReasons(['Harassment/Abuse', 'Scam/Fraud', 'Spam', 'Inappropriate Profile', 'Other']);
    } finally {
      setLoadingReasons(false);
    }
  };

  const fetchCandidates = async (query = '') => {
    setLoadingCandidates(true);
    try {
      const response = await client.get(`/reports/candidates?q=${encodeURIComponent(query)}`);
      if (response.data?.success && Array.isArray(response.data.candidates)) {
        setCandidates(response.data.candidates);
      } else {
        setCandidates([]);
      }
    } catch (err) {
      console.warn('Error fetching candidates:', err.message);
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  };

  useEffect(() => {
    if (!visible || !isSelectable || selectedStudent) return;
    const timer = setTimeout(() => {
      fetchCandidates(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, visible, isSelectable, selectedStudent]);

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

  const effectiveTargetId = targetId || selectedStudent?._id;
  const effectiveTargetType = targetType || 'user';

  const handleSubmit = async () => {
    if (!effectiveTargetId) {
      Alert.alert('Select Student', 'Please select a student/buyer to report.');
      return;
    }
    if (!reason) {
      Alert.alert('Select Reason', 'Please select a reason for reporting.');
      return;
    }

    setLoading(true);
    try {
      let formData = new FormData();
      formData.append('target_type', effectiveTargetType);
      formData.append('target_id', effectiveTargetId);
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
        headers: Platform.OS === 'web' ? {} : { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert(
        'Report Submitted',
        'Thank you for your report. Our campus safety team will review it shortly.'
      );
      setReason('');
      setDescription('');
      setProofImage(null);
      setSelectedStudent(null);
      setSearchQuery('');
      onClose();

      if (typeof onReportSubmitted === 'function') {
        onReportSubmitted();
      }
    } catch (error) {
      console.error('Submit report error:', error);
      Alert.alert('Error', 'Failed to submit the report. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isSelectable ? 'Submit a Report' : `Report ${targetType === 'item' ? 'Listing' : 'User'}`}
            </Text>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Ionicons name="close" size={24} color="#697386" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Target Card or Selection Section */}
            {selectedStudent ? (
              <View style={styles.selectedStudentCard}>
                {selectedStudent.profile_photo_url ? (
                  <Image
                    source={{ uri: selectedStudent.profile_photo_url }}
                    style={styles.selectedStudentAvatar}
                  />
                ) : (
                  <View style={styles.selectedStudentAvatarPlaceholder}>
                    <Text style={styles.selectedStudentInitials}>
                      {selectedStudent.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}

                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.selectedStudentLabel}>Report Target</Text>
                  <Text style={styles.selectedStudentName} numberOfLines={1}>
                    {selectedStudent.full_name}
                  </Text>
                  <Text style={styles.selectedStudentSub} numberOfLines={1}>
                    {selectedStudent.student_id ? `${selectedStudent.student_id} • ` : ''}
                    {selectedStudent.department || selectedStudent.email || (targetType === 'item' ? 'Item Listing' : 'Campus Student')}
                  </Text>
                </View>

                {isSelectable && (
                  <TouchableOpacity
                    style={styles.changeTargetBtn}
                    onPress={() => setSelectedStudent(null)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="swap-horizontal" size={14} color="#007185" style={{ marginRight: 4 }} />
                    <Text style={styles.changeTargetText}>Change</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : isSelectable ? (
              <View style={styles.selectionSection}>
                <Text style={styles.label}>
                  Select Student / Buyer <Text style={styles.requiredStar}>*</Text>
                </Text>

                {/* Search Bar */}
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name, email, or student ID..."
                    placeholderTextColor="#9CA3AF"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery('')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Candidates List */}
                <View style={styles.candidatesWrapper}>
                  {loadingCandidates ? (
                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#007185" />
                      <Text style={{ marginTop: 6, fontSize: 12, color: '#6B7280' }}>
                        Finding students...
                      </Text>
                    </View>
                  ) : candidates.length === 0 ? (
                    <View style={styles.noCandidatesBox}>
                      <Ionicons name="person-outline" size={28} color="#CBD5E1" />
                      <Text style={styles.noCandidatesText}>
                        {searchQuery
                          ? `No students found matching "${searchQuery}"`
                          : 'No recent buyers or contacts found'}
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      style={{ maxHeight: 200 }}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                    >
                      {candidates.map((c) => (
                        <TouchableOpacity
                          key={c._id}
                          style={styles.candidateRow}
                          onPress={() => setSelectedStudent(c)}
                          activeOpacity={0.7}
                        >
                          {c.profile_photo_url ? (
                            <Image
                              source={{ uri: c.profile_photo_url }}
                              style={styles.candidateAvatar}
                            />
                          ) : (
                            <View style={styles.candidateAvatarPlaceholder}>
                              <Text style={styles.candidateAvatarInitials}>
                                {c.full_name?.charAt(0)?.toUpperCase() || 'U'}
                              </Text>
                            </View>
                          )}

                          <View style={{ flex: 1, marginRight: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.candidateName} numberOfLines={1}>
                                {c.full_name}
                              </Text>
                              {c.badge && (
                                <View
                                  style={[
                                    styles.candidateBadge,
                                    c.badge === 'Recent Buyer'
                                      ? styles.buyerBadge
                                      : c.badge === 'In Messages'
                                      ? styles.contactBadge
                                      : styles.studentBadge,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.candidateBadgeText,
                                      c.badge === 'Recent Buyer'
                                        ? styles.buyerBadgeText
                                        : c.badge === 'In Messages'
                                        ? styles.contactBadgeText
                                        : styles.studentBadgeText,
                                    ]}
                                  >
                                    {c.badge}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.candidateMeta} numberOfLines={1}>
                              {c.student_id ? `${c.student_id} • ` : ''}
                              {c.department || c.email}
                            </Text>
                            {c.context && (
                              <Text style={styles.candidateContext} numberOfLines={1}>
                                {c.context}
                              </Text>
                            )}
                          </View>

                          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>
            ) : (
              <Text style={styles.targetText}>
                You are reporting: <Text style={styles.targetName}>{targetName}</Text>
              </Text>
            )}

            {/* Select Reason */}
            <Text style={styles.label}>
              Select a Reason <Text style={styles.requiredStar}>*</Text>
            </Text>
            {loadingReasons ? (
              <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#DC2626" />
              </View>
            ) : (
              <View style={styles.reasonsContainer}>
                {reasons.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.reasonChip, reason === r && styles.reasonChipActive]}
                    onPress={() => setReason(r)}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.reasonChipText,
                        reason === r && styles.reasonChipTextActive,
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Additional Details */}
            <Text style={styles.label}>Additional Details</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Provide any additional context or evidence to help our review team..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
              editable={!loading}
              textAlignVertical="top"
            />

            {/* Proof Section */}
            <View style={styles.proofSection}>
              <Text style={styles.label}>Proof / Evidence (Optional)</Text>
              {proofImage ? (
                <View style={styles.proofPreviewWrapper}>
                  <Image source={{ uri: proofImage }} style={styles.proofImage} />
                  <TouchableOpacity
                    style={styles.removeProofButton}
                    onPress={() => setProofImage(null)}
                  >
                    <Ionicons name="close-circle" size={24} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.attachButton} onPress={pickImage} activeOpacity={0.7}>
                  <Ionicons name="image-outline" size={20} color="#4B5563" style={styles.attachIcon} />
                  <Text style={styles.attachButtonText}>Attach Screenshot/Image</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!reason || !effectiveTargetId || loading) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!reason || !effectiveTargetId || loading}
              activeOpacity={0.8}
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
