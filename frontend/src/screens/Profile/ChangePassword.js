import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import styles from './ChangePassword.styles';

export default function ChangePasswordScreen({ navigation }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleChangePassword = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!newPassword || !confirmPassword) {
      setErrorMsg('All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password must match.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      await client.put('/users/change-password', {
        newPassword
      });

      setSuccessMsg('Password changed successfully!');
      
      // Clear inputs
      setNewPassword('');
      setConfirmPassword('');
      
      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 2000);

    } catch (error) {
      console.error('Change password error:', error);
      if (error.response && error.response.data && error.response.data.error) {
        setErrorMsg(error.response.data.error);
      } else {
        setErrorMsg('Failed to change password. Please try again.');
      }
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
        <Text style={styles.headerTitle}>Change<Text style={{ color: '#007185' }}>Password</Text></Text>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          <View style={styles.headerIcon}>
            <Ionicons name="shield-checkmark" size={32} color="#007185" />
          </View>

          <Text style={styles.pageTitle}>Change Password</Text>
          <Text style={styles.subText}>Your password must be at least 6 characters and should include numbers, letters, and special characters.</Text>

          <View style={styles.formCard}>
            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
            {successMsg ? <Text style={styles.successText}>{successMsg}</Text> : null}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#8792A2" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor="#A0A8B8"
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeButton}>
                  <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color="#8792A2" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#8792A2" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor="#A0A8B8"
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeButton}>
                  <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color="#8792A2" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

        </ScrollView>
        
        {/* Sticky Bottom Action Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleChangePassword}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </View>
  );
}
