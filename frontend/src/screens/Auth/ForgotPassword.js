import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import client from '../../api/client';
import styles from './ForgotPassword.styles';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSendOTP = async () => {
    setErrorMsg('');

    const normalizedEmail = email.toLowerCase().trim();
    const adminEmail = process.env.EXPO_PUBLIC_ADMIN_EMAIL;
    if (!normalizedEmail.endsWith('@bvmengineering.ac.in') && normalizedEmail !== adminEmail) {
      return setErrorMsg('Please enter a valid college email address.');
    }

    setLoading(true);
    try {
      await client.post('/auth/send-login-otp', {
        email: normalizedEmail
      });

      // Navigate to verify OTP screen
      navigation.navigate('VerifyLoginOTP', { email: normalizedEmail });

    } catch (error) {
      setErrorMsg(error.response?.data?.error || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Login with OTP</Text>
        <Text style={styles.subtitle}>Enter your college email address to receive a one-time login code.</Text>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="College Email (@bvmengineering.ac.in)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSendOTP}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Send OTP</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
