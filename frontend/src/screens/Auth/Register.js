import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../../api/client';
import styles from './Register.styles';

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 1 state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [studentId, setStudentId] = useState('');

  // Step 2 state
  const [otp, setOtp] = useState('');

  const handleRegister = async () => {
    setErrorMsg('');

    if (!name.trim()) return setErrorMsg('Full Name cannot be empty.');
    if (!email.toLowerCase().endsWith('@bvmengineering.ac.in')) {
      return setErrorMsg('Only @bvmengineering.ac.in emails are allowed.');
    }
    if (password.length < 6) return setErrorMsg('Password must be at least 6 characters long.');

    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    if (!specialCharRegex.test(password)) {
      return setErrorMsg('Password must contain at least one special character.');
    }

    if (phone.length < 10) return setErrorMsg('Please enter a valid phone number.');
    if (!studentId.trim()) return setErrorMsg('Student ID cannot be empty.');

    setLoading(true);
    try {
      await client.post('/auth/register', {
        full_name: name,
        email: email.toLowerCase(),
        password,
        phone,
        student_id: studentId
      });
      setStep(2);
      setErrorMsg('');
    } catch (error) {
      setErrorMsg(error.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setErrorMsg('');
    if (!otp || otp.length < 6) {
      return setErrorMsg('Please enter a valid 6-digit OTP.');
    }

    setLoading(true);
    try {
      const response = await client.post('/auth/verify-otp', {
        email: email.toLowerCase(),
        otp
      });

      // Save token
      await AsyncStorage.setItem('token', response.data.token);

      navigation.navigate('Login');
    } catch (error) {
      setErrorMsg(error.response?.data?.error || 'Invalid OTP.');
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
        {/* Branded Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoText}>CM</Text>
          </View>
        </View>

        <Text style={styles.title}>{step === 1 ? 'Create Account' : 'Verify Email'}</Text>
        <Text style={styles.subtitle}>
          {step === 1 ? 'Create your verified BVM Engineering College account' : `Enter the OTP sent to ${email}`}
        </Text>

        {step === 1 ? (
          <View style={styles.formContainer}>
            <View style={styles.inputRow}>
              <Ionicons name="id-card-outline" size={20} color="#8792A2" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Student ID"
                placeholderTextColor="#A0A8B8"
                value={studentId}
                onChangeText={setStudentId}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={20} color="#8792A2" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Full Name"
                placeholderTextColor="#A0A8B8"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={20} color="#8792A2" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="College Email (@bvmengineering.ac.in)"
                placeholderTextColor="#A0A8B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputRow}>
              <Ionicons name="call-outline" size={20} color="#8792A2" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Phone Number"
                placeholderTextColor="#A0A8B8"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={20} color="#8792A2" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Password"
                placeholderTextColor="#A0A8B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Sign Up</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchLinkContainer}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.switchLinkText}>
                Already have an account? <Text style={styles.switchLinkTextBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <View style={styles.inputRow}>
              <Ionicons name="keypad-outline" size={20} color="#8792A2" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="6-Digit OTP Code"
                placeholderTextColor="#A0A8B8"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleVerifyOTP}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Verify Account</Text>}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.backButton} onPress={() => step === 2 ? setStep(1) : navigation.goBack()}>
          <Text style={styles.backButtonText}>← {step === 2 ? 'Back to Details' : 'Back to Home'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
