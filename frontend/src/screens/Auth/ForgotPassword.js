import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../../api/client';
import { colors } from '../../theme/colors';
import styles from './ForgotPassword.styles';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const borderAnim = useRef(new Animated.Value(0)).current;

  const focusField = () =>
    Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  const blurField = () =>
    Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();

  const animatedInputStyle = {
    borderColor: borderAnim.interpolate({ inputRange: [0, 1], outputRange: ['#E2E8F0', colors.brand] }),
    backgroundColor: borderAnim.interpolate({ inputRange: [0, 1], outputRange: ['#F7F9FC', '#FFFFFF'] }),
  };

  const handleSendOTP = async () => {
    setErrorMsg('');
    const normalizedEmail = email.toLowerCase().trim();
    const adminEmail = process.env.EXPO_PUBLIC_ADMIN_EMAIL;
    if (!normalizedEmail.endsWith('@bvmengineering.ac.in') && normalizedEmail !== adminEmail) {
      return setErrorMsg('Please enter a valid college email address.');
    }
    setLoading(true);
    try {
      await client.post('/auth/send-login-otp', { email: normalizedEmail });
      navigation.navigate('VerifyLoginOTP', { email: normalizedEmail });
    } catch (error) {
      setErrorMsg(error.response?.data?.error || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <Image source={require('../../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
            </View>

            <Text style={styles.title}>Sign in with OTP</Text>
            <Text style={styles.subtitle}>
              Enter your registered email to receive a one-time verification code.
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formContainer}>
            <Text style={styles.inputLabel}>Register Email</Text>
            <Animated.View style={[styles.inputRow, animatedInputStyle]}>
              <Ionicons name="mail-outline" size={20} color={colors.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Registered Email"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={focusField}
                onBlur={blurField}
              />
            </Animated.View>

            {errorMsg ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={handleSendOTP}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>Send OTP</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.infoRow}>
              <Ionicons name="information-circle-outline" size={16} color={colors.subtle} />
              <Text style={styles.infoText}>
                A 6-digit code will be sent to your BVM email.
              </Text>
            </View>
          </View>

          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color={colors.muted} style={{ marginRight: 6 }} />
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
