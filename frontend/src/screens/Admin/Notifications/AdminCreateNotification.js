import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import client from '../../../api/client';
import styles from './AdminCreateNotification.styles';

export default function AdminCreateNotificationScreen() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState('ALL'); // 'ALL' | 'SPECIFIC'
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Student Picker State
  const [studentPickerVisible, setStudentPickerVisible] = useState(false);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Attachment State
  const [attachedFile, setAttachedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const navigation = useNavigation();

  // Load students for picker
  const loadStudents = async () => {
    if (students.length > 0) return;
    setLoadingStudents(true);
    try {
      const response = await client.get('/admin/users');
      const studentUsers = (response.data || []).filter((u) => u.role !== 'admin');
      setStudents(studentUsers);
      setFilteredStudents(studentUsers);
    } catch (err) {
      console.error('Failed to load students for picker:', err);
      Alert.alert('Error', 'Unable to fetch student list.');
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (targetType === 'SPECIFIC') {
      loadStudents();
    }
  }, [targetType]);

  const handleStudentSearch = (query) => {
    setStudentSearch(query);
    if (!query.trim()) {
      setFilteredStudents(students);
      return;
    }
    const lower = query.toLowerCase();
    const filtered = students.filter(
      (s) =>
        s.full_name?.toLowerCase().includes(lower) ||
        s.email?.toLowerCase().includes(lower) ||
        s.student_id?.toLowerCase().includes(lower)
    );
    setFilteredStudents(filtered);
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setStudentPickerVisible(false);
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        // Enforce 10MB limit
        if (file.size && file.size > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select a PDF document under 10MB.');
          return;
        }
        setAttachedFile({
          uri: file.uri,
          name: file.name || 'document.pdf',
          size: file.size || 0,
          mimeType: file.mimeType || 'application/pdf',
        });
      }
    } catch (err) {
      console.error('Error picking document:', err);
      Alert.alert('Error', 'Failed to pick document.');
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Field', 'Please enter a notification title.');
      return;
    }
    if (!body.trim()) {
      Alert.alert('Missing Field', 'Please enter the notification message body.');
      return;
    }
    if (targetType === 'SPECIFIC' && !selectedStudent) {
      Alert.alert('Missing Recipient', 'Please select a student to receive this notification.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('body', body.trim());
      formData.append('targetType', targetType);

      if (targetType === 'SPECIFIC') {
        formData.append('targetUserId', selectedStudent.id || selectedStudent._id);
      }

      if (attachedFile) {
        if (Platform.OS === 'web') {
          const res = await fetch(attachedFile.uri);
          const blob = await res.blob();
          formData.append('pdf', blob, attachedFile.name);
        } else {
          formData.append('pdf', {
            uri: attachedFile.uri,
            name: attachedFile.name,
            type: attachedFile.mimeType || 'application/pdf',
          });
        }
      }

      await client.post('/admin/notifications', formData, {
        headers: Platform.OS === 'web' ? {} : { 'Content-Type': 'multipart/form-data' },
      });

      // Silently and immediately redirect to Notifications main page without popup alert
      navigation.navigate('AdminNotifications');
    } catch (err) {
      console.error('Failed to create notification:', err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to dispatch notification.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compose Notification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Audience Target */}
        <Text style={styles.sectionTitle}>Target Audience</Text>
        <View style={styles.audienceRow}>
          <TouchableOpacity
            style={[
              styles.audienceOption,
              targetType === 'ALL' && styles.audienceOptionActive,
            ]}
            onPress={() => setTargetType('ALL')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="people"
              size={24}
              color={targetType === 'ALL' ? '#007185' : '#94A3B8'}
            />
            <Text
              style={[
                styles.audienceOptionTitle,
                targetType === 'ALL' && styles.audienceOptionTitleActive,
              ]}
            >
              All Students
            </Text>
            <Text style={styles.audienceOptionDesc}>Broadcast to all platform users</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.audienceOption,
              targetType === 'SPECIFIC' && styles.audienceOptionActive,
            ]}
            onPress={() => {
              setTargetType('SPECIFIC');
              if (!selectedStudent) {
                setStudentPickerVisible(true);
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="person"
              size={24}
              color={targetType === 'SPECIFIC' ? '#007185' : '#94A3B8'}
            />
            <Text
              style={[
                styles.audienceOptionTitle,
                targetType === 'SPECIFIC' && styles.audienceOptionTitleActive,
              ]}
            >
              Specific Student
            </Text>
            <Text style={styles.audienceOptionDesc}>Send to an individual student</Text>
          </TouchableOpacity>
        </View>

        {/* Selected Student Card when SPECIFIC */}
        {targetType === 'SPECIFIC' && (
          <View style={styles.studentSelectorCard}>
            {selectedStudent ? (
              <View style={styles.studentSelectedRow}>
                <View style={styles.studentInfo}>
                  <View style={styles.studentAvatar}>
                    <Text style={styles.studentAvatarText}>
                      {selectedStudent.full_name?.charAt(0)?.toUpperCase() || 'S'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.studentName} numberOfLines={1}>
                      {selectedStudent.full_name}
                    </Text>
                    <Text style={styles.studentEmail} numberOfLines={1}>
                      {selectedStudent.email}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.changeStudentBtn}
                  onPress={() => setStudentPickerVisible(true)}
                >
                  <Text style={styles.changeStudentText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 8 }}
                onPress={() => setStudentPickerVisible(true)}
              >
                <Ionicons name="search" size={18} color="#007185" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#007185' }}>
                  Select Student
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Message Content */}
        <Text style={styles.sectionTitle}>Notification Content</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Notification Title (e.g., Campus Schedule Update)"
            placeholderTextColor="#94A3B8"
            value={title}
            onChangeText={setTitle}
            maxLength={120}
          />
        </View>

        <View style={[styles.inputContainer, styles.textArea]}>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Type your announcement or message for students here..."
            placeholderTextColor="#94A3B8"
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* PDF Attachment */}
        <Text style={styles.sectionTitle}>Attach PDF Document (Optional)</Text>
        {attachedFile ? (
          <View style={styles.fileCard}>
            <View style={styles.fileCardLeft}>
              <Ionicons name="document-text" size={30} color="#007185" />
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {decodeURIComponent(attachedFile.name)}
                </Text>
                <Text style={styles.fileMeta}>
                  PDF Document • {formatFileSize(attachedFile.size)}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.removeFileBtn} onPress={handleRemoveFile}>
              <Ionicons name="close-circle" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.attachBox} onPress={handlePickDocument} activeOpacity={0.7}>
            <Ionicons name="cloud-upload-outline" size={28} color="#007185" />
            <Text style={styles.attachBoxText}>Select PDF File</Text>
            <Text style={styles.attachBoxHint}>Supports PDF files up to 10 MB</Text>
          </TouchableOpacity>
        )}

        {/* Send Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                {targetType === 'ALL' ? 'Send Broadcast Notification' : 'Send to Student'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Student Picker Modal */}
      <Modal
        visible={studentPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setStudentPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Recipient Student</Text>
              <TouchableOpacity onPress={() => setStudentPickerVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.modalSearchContainer}>
              <Ionicons name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search by student name or email..."
                placeholderTextColor="#94A3B8"
                value={studentSearch}
                onChangeText={handleStudentSearch}
                autoFocus
              />
              {Boolean(studentSearch) && (
                <TouchableOpacity onPress={() => handleStudentSearch('')}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Student List */}
            {loadingStudents ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#007185" />
              </View>
            ) : (
              <FlatList
                data={filteredStudents}
                keyExtractor={(item) => String(item.id || item._id)}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.studentListItem}
                    onPress={() => handleSelectStudent(item)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View style={styles.studentAvatar}>
                        <Text style={styles.studentAvatarText}>
                          {item.full_name?.charAt(0)?.toUpperCase() || 'S'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.studentName} numberOfLines={1}>
                          {item.full_name}
                        </Text>
                        <Text style={styles.studentEmail} numberOfLines={1}>
                          {item.email}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <Text style={{ color: '#94A3B8', fontSize: 14 }}>No students found.</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

