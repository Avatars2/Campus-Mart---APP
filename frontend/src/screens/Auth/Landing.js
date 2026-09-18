import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, Animated, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import styles from './Landing.styles';

export default function LandingScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;

  // Create staggered animations for 3 features + 2 buttons
  const staggerItems = useRef([...Array(5)].map(() => new Animated.Value(0))).current;
  const staggerSlides = useRef([...Array(5)].map(() => new Animated.Value(30))).current;

  useEffect(() => {
    // 1. Base layout: hero fade + card slide up
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Staggered children: wait for card to finish (700ms), then cascade in
    const staggerAnimations = staggerItems.map((anim, index) =>
      Animated.parallel([
        Animated.timing(anim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(staggerSlides[index], {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );

    const staggerSequence = Animated.stagger(90, staggerAnimations);
    setTimeout(() => staggerSequence.start(), 700);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView 
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Section */}
        <Animated.View style={[styles.heroSection, { opacity: fadeAnim }]}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../../assets/logo.png')} 
              style={styles.logoImage} 
              resizeMode="contain" 
            />
          </View>
          <Text style={styles.title}>CampusMart</Text>
          <Text style={styles.subtitle}>Buy. Sell. Connect. On Campus.</Text>
        </Animated.View>

        {/* Bottom Card */}
        <Animated.View 
          style={[
            styles.bottomCard, 
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.builtForBadge}>
              <Text style={styles.builtForText}>Built for BVM</Text>
            </View>
            <Text style={styles.collegeName}>Birla Vishvakarma Mahavidyalaya</Text>
            <Text style={styles.location}>V.V. Nagar, Anand</Text>
          </View>

          <Text style={styles.description}>
            Discover useful items from your campus community or give your unused things a new home.
          </Text>

          {/* New Features List */}
          <View style={styles.featuresList}>
            {/* Item 1 */}
            <Animated.View style={{ opacity: staggerItems[0], transform: [{ translateY: staggerSlides[0] }] }}>
              <View style={styles.featureItem}>
                <View style={styles.featureIconBg}>
                  <Ionicons name="people" size={24} color={colors.brand} />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>BVM COMMUNITY</Text>
                  <Text style={styles.featureDesc}>Trade within your college community</Text>
                </View>
              </View>
            </Animated.View>

            {/* Item 2 */}
            <Animated.View style={{ opacity: staggerItems[1], transform: [{ translateY: staggerSlides[1] }] }}>
              <View style={styles.featureItem}>
                <View style={styles.featureIconBg}>
                  <Ionicons name="location" size={24} color={colors.brand} />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>LOCAL & CONVENIENT</Text>
                  <Text style={styles.featureDesc}>Meet and exchange on campus</Text>
                </View>
              </View>
            </Animated.View>

            {/* Item 3 */}
            <Animated.View style={{ opacity: staggerItems[2], transform: [{ translateY: staggerSlides[2] }] }}>
              <View style={styles.featureItem}>
                <View style={styles.featureIconBg}>
                  <Ionicons name="pricetag" size={24} color={colors.brand} />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>SIMPLE TO SELL</Text>
                  <Text style={styles.featureDesc}>List items in a few steps</Text>
                </View>
              </View>
            </Animated.View>
          </View>

          <View style={styles.actionContainer}>
            {/* Button 1 */}
            <Animated.View style={{ opacity: staggerItems[3], transform: [{ translateY: staggerSlides[3] }] }}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={() => navigation.navigate('Register')}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Get Started</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Button 2 */}
            <Animated.View style={{ opacity: staggerItems[4], transform: [{ translateY: staggerSlides[4] }] }}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryButtonText}>Already have an account? Sign In</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
