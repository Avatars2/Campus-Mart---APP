import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { FAQ_CATEGORIES, FAQ_ITEMS } from '../../constants/faqData';
import styles from './Help.styles';

const DEFAULT_ADMIN_EMAIL = process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'avatars2610@gmail.com';
const DEFAULT_ADMIN_PHONE = '1234567890';

export default function HelpScreen({ navigation }) {
  const [adminContact, setAdminContact] = useState({
    name: 'CampusMart Admin',
    email: DEFAULT_ADMIN_EMAIL,
    phone: DEFAULT_ADMIN_PHONE,
  });
  const [contactLoading, setContactLoading] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Fetch live Admin Contact info from backend
  useEffect(() => {
    let isMounted = true;
    const fetchAdminContact = async () => {
      try {
        setContactLoading(true);
        const res = await client.get('/support/contact');
        if (isMounted && res.data) {
          setAdminContact({
            name: res.data.name || 'CampusMart Admin',
            email: res.data.email || DEFAULT_ADMIN_EMAIL,
            phone: res.data.phone || DEFAULT_ADMIN_PHONE,
          });
        }
      } catch (error) {
        // Fallback silently to defaults
        console.log('Using default admin contact info');
      } finally {
        if (isMounted) setContactLoading(false);
      }
    };

    fetchAdminContact();
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePhoneCall = async () => {
    const phoneNumber = adminContact.phone;
    if (!phoneNumber) {
      Alert.alert('Phone Unavailable', 'Admin phone number is currently not set.');
      return;
    }
    const url = `tel:${phoneNumber}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Admin Phone Number',
          `Direct dial is not supported on this device.\n\nAdmin Phone: ${phoneNumber}`,
          [{ text: 'OK' }]
        );
      }
    } catch {
      Alert.alert('Admin Contact', `Phone: ${phoneNumber}`);
    }
  };

  const handleSendEmail = async () => {
    const email = adminContact.email;
    if (!email) {
      Alert.alert('Email Unavailable', 'Admin email is currently not set.');
      return;
    }
    const url = `mailto:${email}?subject=${encodeURIComponent('CampusMart Support Request')}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Admin Email Address',
          `Mail client is not configured on this device.\n\nAdmin Email:\n${email}`,
          [{ text: 'OK' }]
        );
      }
    } catch {
      Alert.alert('Admin Email', email);
    }
  };

  const toggleAccordion = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Filter FAQ items by selected category and search text
  const filteredFaqs = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#0F1111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & FAQs</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Contact Admin Section ── */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionHeading}>Contact Admin Directly</Text>
          <View style={styles.contactGrid}>
            {/* Phone Card */}
            <TouchableOpacity
              style={styles.contactCard}
              onPress={handlePhoneCall}
              activeOpacity={0.8}
            >
              <View style={[styles.contactIconCircle, styles.phoneCircle]}>
                <Ionicons name="call" size={24} color="#059669" />
              </View>
              <Text style={styles.contactTitle}>Admin Call</Text>
              <Text style={styles.contactDetail} numberOfLines={1}>
                {adminContact.phone || 'Contact Number'}
              </Text>
              <View style={[styles.contactActionPill, styles.phoneActionPill]}>
                <Ionicons name="call-outline" size={13} color="#FFFFFF" />
                <Text style={styles.contactActionText}>Call Admin</Text>
              </View>
            </TouchableOpacity>

            {/* Email Card */}
            <TouchableOpacity
              style={styles.contactCard}
              onPress={handleSendEmail}
              activeOpacity={0.8}
            >
              <View style={[styles.contactIconCircle, styles.emailCircle]}>
                <Ionicons name="mail" size={24} color="#007185" />
              </View>
              <Text style={styles.contactTitle}>Admin Email</Text>
              <Text style={styles.contactDetail} numberOfLines={1}>
                {adminContact.email || 'Email Support'}
              </Text>
              <View style={[styles.contactActionPill, styles.emailActionPill]}>
                <Ionicons name="mail-outline" size={13} color="#FFFFFF" />
                <Text style={styles.contactActionText}>Send Mail</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search Bar ── */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search questions (e.g. refund, payment)..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Category Chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          {FAQ_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={cat.icon}
                  size={15}
                  color={isActive ? '#FFFFFF' : '#4B5563'}
                />
                <Text
                  style={[styles.chipText, isActive && styles.chipTextActive]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── FAQ Accordion Section ── */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionHeading}>
            Frequently Asked Questions ({filteredFaqs.length})
          </Text>

          {filteredFaqs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={40} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No Questions Found</Text>
              <Text style={styles.emptyStateSub}>
                Try searching with different keywords or contact Admin directly.
              </Text>
            </View>
          ) : (
            filteredFaqs.map((faq) => {
              const isExpanded = expandedId === faq.id;
              return (
                <View key={faq.id} style={styles.faqCard}>
                  <TouchableOpacity
                    style={styles.faqQuestionRow}
                    onPress={() => toggleAccordion(faq.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.faqQuestionLeft}>
                      <View style={styles.faqCategoryBadge}>
                        <Text style={styles.faqCategoryBadgeText}>
                          {faq.category}
                        </Text>
                      </View>
                      <Text style={styles.faqQuestionText}>{faq.question}</Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={isExpanded ? '#007185' : '#9CA3AF'}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.faqAnswerContainer}>
                      <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

