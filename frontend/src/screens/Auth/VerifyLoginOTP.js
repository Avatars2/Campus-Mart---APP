import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';
import styles from './VerifyLoginOTP.styles';

export default function VerifyLoginOTPScreen({ route, navigation }) {
  const { signIn } = useContext(AuthContext);
  const { email } = route.params;
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleVerifyOTP = async () => {
    setErrorMsg('');
    
    if (!otp || otp.length < 6) {
      return setErrorMsg('Please enter the 6-digit OTP.');
    }

    setLoading(true);
    try {
      const response = await client.post('/auth/verify-login-otp', {
        email,
        otp
      });
      
      // Successfully verified, log the user in immediately
      await signIn(response.data.token, response.data.user);
      
    } catch (error) {
      setErrorMsg(error.response?.data?.error || 'Invalid or expired OTP.');
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
        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subtitle}>We've sent a 6-digit code to {email}</Text>
        
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
          />
          
          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={handleVerifyOTP}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Verify & Login</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
