import React, { useState, useRef, useContext } from 'react';
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
import { AuthContext } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import styles from './VerifyLoginOTP.styles';

export default function VerifyLoginOTPScreen({ route, navigation }) {
  const { signIn } = useContext(AuthContext);
  const { email } = route.params;

  const [otp, setOtp] = useState('');
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

  const handleVerifyOTP = async () => {
    setErrorMsg('');
    if (!otp || otp.length < 6) {
      return setErrorMsg('Please enter the 6-digit OTP.');
    }
    setLoading(true);
    try {
      const response = await client.post('/auth/verify-login-otp', { email, otp });
      await signIn(response.data.token, response.data.user);
    } catch (error) {
      setErrorMsg(error.response?.data?.error || 'Invalid or expired OTP.');
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
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit verification code to your registered email.
            </Text>
            <View style={styles.emailChip}>
              <Ionicons name="mail" size={14} color={colors.brandDark} />
              <Text style={styles.emailChipText} numberOfLines={1}>{email}</Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.formContainer}>
            <Text style={styles.inputLabel}>Enter 6-digit OTP</Text>

            <Animated.View style={[styles.inputRow, animatedInputStyle]}>
              <Ionicons name="keypad-outline" size={20} color={colors.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="• • • • • •"
                placeholderTextColor="#CBD5E1"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                onFocus={focusField}
                onBlur={blurField}
              />
              {otp.length === 6 && (
                <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
              )}
            </Animated.View>

            {/* OTP length indicator dots */}
            <View style={styles.dotsRow}>
              {[...Array(6)].map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i < otp.length && styles.dotFilled]}
                />
              ))}
            </View>

            {errorMsg ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={handleVerifyOTP}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>Verify & Login</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={15} color={colors.subtle} />
              <Text style={styles.infoText}>Code expires in 10 minutes</Text>
            </View>
          </View>

          {/* Back */}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color={colors.muted} style={{ marginRight: 6 }} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
