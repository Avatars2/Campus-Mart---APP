import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';
import styles from './Login.styles';

export default function LoginScreen({ navigation }) {
  const { signIn } = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    setErrorMsg('');

    const normalizedEmail = email.toLowerCase().trim();
    const adminEmail = process.env.EXPO_PUBLIC_ADMIN_EMAIL;
    if (!normalizedEmail.endsWith('@bvmengineering.ac.in') && normalizedEmail !== adminEmail) {
      return setErrorMsg('Please enter a valid college email address.');
    }
    if (!password.trim()) {
      return setErrorMsg('Password is required.');
    }

    setLoading(true);
    try {
      const response = await client.post('/auth/login', {
        email: normalizedEmail,
        password
      });

      // Use the global signIn function which saves token and changes state
      await signIn(response.data.token, response.data.user);

    } catch (error) {
      setErrorMsg(error.response?.data?.error || 'Invalid email or password.');
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

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Your verified BVM Engineering College marketplace</Text>

        <View style={styles.formContainer}>
          {/* Email Input */}
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={20} color="#8792A2" style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              placeholder="College Email"
              placeholderTextColor="#A0A8B8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password Input */}
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
            style={styles.forgotLink}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotLinkText}>Login with OTP?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Sign In</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchLinkContainer}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.switchLinkText}>
              Don't have an account? <Text style={styles.switchLinkTextBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
