import React, { useState, useRef, useContext } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import styles from './Login.styles';

export default function LoginScreen({ navigation }) {
  const { signIn } = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Animated focus borders
  const fields = ['email', 'password'];
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
      const response = await client.post('/auth/login', { email: normalizedEmail, password });
      await signIn(response.data.token, response.data.user);
    } catch (error) {
      setErrorMsg(error.response?.data?.error || 'Invalid email or password.');
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
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your BVM campus account</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formContainer}>
            {/* Email */}
            <Animated.View style={[styles.inputRow, getAnimatedInputStyle('email')]}>
              <Ionicons name="mail-outline" size={20} color={colors.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="College Email (@bvmengineering.ac.in)"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => focusField('email')}
                onBlur={() => blurField('email')}
              />
            </Animated.View>

            {/* Password */}
            <Animated.View style={[styles.inputRow, getAnimatedInputStyle('password')]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Password"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                onFocus={() => focusField('password')}
                onBlur={() => blurField('password')}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
              </TouchableOpacity>
            </Animated.View>

            {/* Error */}
            {errorMsg ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Forgot / OTP */}
            <TouchableOpacity style={styles.forgotLink} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotLinkText}>Login with OTP?</Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>

            {/* Sign Up Link */}
            <TouchableOpacity style={styles.switchLinkContainer} onPress={() => navigation.navigate('Register')}>
              <Text style={styles.switchLinkText}>
                Don't have an account?{' '}
                <Text style={styles.switchLinkTextBold}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Back */}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.65)" style={{ marginRight: 6 }} />
            <Text style={styles.backButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
