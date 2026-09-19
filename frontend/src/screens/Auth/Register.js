import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../../api/client';
import { colors } from '../../theme/colors';
import styles from './Register.styles';

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [studentId, setStudentId] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const fields = ['studentId', 'name', 'email', 'phone', 'password', 'otp'];
  const borderAnims = useRef(
    fields.reduce((acc, key) => {
      acc[key] = new Animated.Value(0);
      return acc;
    }, {})
  ).current;

  const focusField = (key) => {
    Animated.timing(borderAnims[key], { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const blurField = (key) => {
    Animated.timing(borderAnims[key], { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };
  const getAnimatedInputStyle = (key) => ({
    borderColor: borderAnims[key].interpolate({ inputRange: [0, 1], outputRange: ['#E2E8F0', colors.brand] }),
    backgroundColor: borderAnims[key].interpolate({ inputRange: [0, 1], outputRange: ['#F7F9FC', '#FFFFFF'] }),
  });

  const handleRegister = async () => {
    setErrorMsg('');
    if (!name.trim()) return setErrorMsg('Full Name cannot be empty.');
    if (!email.toLowerCase().endsWith('@bvmengineering.ac.in'))
      return setErrorMsg('Only @bvmengineering.ac.in emails are allowed.');
    if (password.length < 6) return setErrorMsg('Password must be at least 6 characters long.');
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    if (!specialCharRegex.test(password))
      return setErrorMsg('Password must contain at least one special character.');
    if (phone.length < 10) return setErrorMsg('Please enter a valid phone number.');
    if (!studentId.trim()) return setErrorMsg('Student ID cannot be empty.');
    setLoading(true);
    try {
      await client.post('/auth/register', { full_name: name, email: email.toLowerCase(), password, phone, student_id: studentId });
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
    if (!otp || otp.length < 6) return setErrorMsg('Please enter a valid 6-digit OTP.');
    setLoading(true);
    try {
      const response = await client.post('/auth/verify-otp', { email: email.toLowerCase(), otp });
      await AsyncStorage.setItem('token', response.data.token);
      navigation.navigate('Login');
    } catch (error) {
      setErrorMsg(error.response?.data?.error || 'Invalid OTP.');
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
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <Image source={require('../../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
            </View>
            <Text style={styles.title}>{step === 1 ? 'Create Account' : 'Verify Email'}</Text>
            <Text style={styles.subtitle}>
              {step === 1 ? 'Join the BVM Engineering College marketplace.' : `We sent a 6-digit code to\n${email}`}
            </Text>
          </View>

          {step === 1 ? (
            <View style={styles.formContainer}>
              <Animated.View style={[styles.inputRow, getAnimatedInputStyle('studentId')]}>
                <Ionicons name="id-card-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                <TextInput style={styles.inputField} placeholder="Student ID" placeholderTextColor="#94A3B8"
                  value={studentId} onChangeText={setStudentId} autoCapitalize="characters"
                  onFocus={() => focusField('studentId')} onBlur={() => blurField('studentId')} />
              </Animated.View>

              <Animated.View style={[styles.inputRow, getAnimatedInputStyle('name')]}>
                <Ionicons name="person-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                <TextInput style={styles.inputField} placeholder="Full Name" placeholderTextColor="#94A3B8"
                  value={name} onChangeText={setName} autoCapitalize="words"
                  onFocus={() => focusField('name')} onBlur={() => blurField('name')} />
              </Animated.View>

              <Animated.View style={[styles.inputRow, getAnimatedInputStyle('email')]}>
                <Ionicons name="mail-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                <TextInput style={styles.inputField} placeholder="College Email (@bvmengineering.ac.in)" placeholderTextColor="#94A3B8"
                  value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"
                  onFocus={() => focusField('email')} onBlur={() => blurField('email')} />
              </Animated.View>

              <Animated.View style={[styles.inputRow, getAnimatedInputStyle('phone')]}>
                <Ionicons name="call-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                <TextInput style={styles.inputField} placeholder="Phone Number" placeholderTextColor="#94A3B8"
                  value={phone} onChangeText={setPhone} keyboardType="phone-pad"
                  onFocus={() => focusField('phone')} onBlur={() => blurField('phone')} />
              </Animated.View>

              <Animated.View style={[styles.inputRow, getAnimatedInputStyle('password')]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                <TextInput style={styles.inputField} placeholder="Password" placeholderTextColor="#94A3B8"
                  value={password} onChangeText={setPassword} secureTextEntry={!showPassword}
                  onFocus={() => focusField('password')} onBlur={() => blurField('password')} />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
                </TouchableOpacity>
              </Animated.View>

              {errorMsg ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              <TouchableOpacity style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Sign Up</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.switchLinkContainer} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.switchLinkText}>
                  Already have an account? <Text style={styles.switchLinkTextBold}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <Animated.View style={[styles.inputRow, getAnimatedInputStyle('otp')]}>
                <Ionicons name="keypad-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                <TextInput style={[styles.inputField, styles.otpField]} placeholder="6-Digit OTP" placeholderTextColor="#94A3B8"
                  value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6}
                  onFocus={() => focusField('otp')} onBlur={() => blurField('otp')} />
              </Animated.View>

              {errorMsg ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              <TouchableOpacity style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                onPress={handleVerifyOTP} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Verify Account</Text>}
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.backButton} onPress={() => (step === 2 ? setStep(1) : navigation.goBack())}>
            <Ionicons name="arrow-back" size={18} color={colors.muted} style={{ marginRight: 6 }} />
            <Text style={styles.backButtonText}>{step === 2 ? 'Back to Details' : 'Back to Home'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
