import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Image, Alert, Modal, FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import styles from './EditProfile.styles';

export default function EditProfileScreen({ route, navigation }) {
  const profile = route?.params?.profile || {};
  const onGoBack = route?.params?.onGoBack;

  const [fullName, setFullName] = useState(profile.full_name || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [department, setDepartment] = useState(profile.department || '');
  const [year, setYear] = useState(profile.year_semester || '');
  const [photoUrl, setPhotoUrl] = useState(profile.profile_photo_url || null);
  
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [departmentModalVisible, setDepartmentModalVisible] = useState(false);
  const [yearModalVisible, setYearModalVisible] = useState(false);
  
  const departmentsList = [
    'Computer', 'Civil', 'Structure', 'Electrical', 
    'Electronics', 'Mechanical', 'Production', 'Mathematics'
  ];

  const yearsList = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permission Refused", "You need to allow access to your photos to change your profile picture.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        uploadImage(result.assets[0]);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      setErrorMsg("Failed to pick image from gallery.");
    }
  };

  const uploadImage = async (asset) => {
    setUploadingImage(true);
    setErrorMsg('');
    try {
      const formData = new FormData();
      const uri = asset.uri;
      
      let filename = uri.split('/').pop() || 'photo.jpg';
      if (!filename.includes('.')) {
        filename += '.jpg';
      }
      
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('photo', blob, filename);
      } else {
        formData.append('photo', {
          uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
          name: filename,
          type,
        });
      }

      const response = await client.post('/users/profile/photo', formData, {
        headers: Platform.OS === 'web' ? {} : {
          'Content-Type': 'multipart/form-data',
        },
      });

      setPhotoUrl(response.data.photoUrl);

    } catch (error) {
      console.error("Upload Error:", error);
      setErrorMsg(error.response?.data?.error || "Failed to upload image. Check backend connection.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpdateProfile = async () => {
    setErrorMsg('');
    
    if (!fullName.trim()) return setErrorMsg('Full Name cannot be empty.');
    if (phone.length < 10) return setErrorMsg('Please enter a valid phone number.');

    setLoading(true);
    try {
      await client.put('/users/profile', {
        full_name: fullName,
        phone,
        department,
        year_semester: year
      });
      
      navigation.goBack();
    } catch (error) {
      setErrorMsg(error.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#0F1111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit<Text style={{ color: '#007185' }}>Profile</Text></Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.photoSection}>
            <TouchableOpacity onPress={pickImage} disabled={uploadingImage} activeOpacity={0.8}>
              <View style={styles.profileImageContainer}>
                <Image 
                  source={{ uri: photoUrl || 'https://via.placeholder.com/150' }} 
                  style={styles.profileImage} 
                />
                <View style={styles.imageBadge}>
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="camera" size={16} color="#FFF" />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.formCard}>
            
            <Text style={[styles.sectionLabel, styles.sectionLabelFirst]}>Personal Details</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#8792A2" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#A0A8B8"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mobile Number *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#8792A2" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor="#A0A8B8"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <Text style={styles.sectionLabel}>Academic Info</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Department</Text>
              <TouchableOpacity 
                style={styles.selectorButton} 
                onPress={() => setDepartmentModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={styles.selectorContent}>
                  <Ionicons name="business-outline" size={20} color="#8792A2" style={styles.inputIcon} />
                  <Text style={[styles.selectorText, !department && styles.selectorTextPlaceholder]}>
                    {department ? department : 'Select Department'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color="#8792A2" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Year</Text>
              <TouchableOpacity 
                style={styles.selectorButton} 
                onPress={() => setYearModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={styles.selectorContent}>
                  <Ionicons name="school-outline" size={20} color="#8792A2" style={styles.inputIcon} />
                  <Text style={[styles.selectorText, !year && styles.selectorTextPlaceholder]}>
                    {year ? year : 'Select Year'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color="#8792A2" />
              </TouchableOpacity>
            </View>



            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          </View>
        </ScrollView>
        
        {/* Sticky Bottom Action Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={handleUpdateProfile}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Save Changes</Text>}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>

      {/* Department Modal */}
      <Modal visible={departmentModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Department</Text>
            <FlatList
              data={departmentsList}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isActive = department === item;
                return (
                  <TouchableOpacity 
                    style={[styles.modalItem, isActive && styles.modalItemActive]}
                    onPress={() => { setDepartment(item); setDepartmentModalVisible(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>{item}</Text>
                    {isActive && <Ionicons name="checkmark-circle" size={24} color="#007185" />}
                  </TouchableOpacity>
                );
              }}
              showsVerticalScrollIndicator={false}
            />
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setDepartmentModalVisible(false)} activeOpacity={0.7}>
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Year Modal */}
      <Modal visible={yearModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Year</Text>
            <FlatList
              data={yearsList}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isActive = year === item;
                return (
                  <TouchableOpacity 
                    style={[styles.modalItem, isActive && styles.modalItemActive]}
                    onPress={() => { setYear(item); setYearModalVisible(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>{item}</Text>
                    {isActive && <Ionicons name="checkmark-circle" size={24} color="#007185" />}
                  </TouchableOpacity>
                );
              }}
              showsVerticalScrollIndicator={false}
            />
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setYearModalVisible(false)} activeOpacity={0.7}>
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}
