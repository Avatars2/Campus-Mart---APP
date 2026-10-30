import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from './ReportDetails.styles';

export default function ReportDetails({ route, navigation }) {
  const { report } = route.params;

  const targetName =
    report.target_info?.full_name ||
    report.target_info?.name ||
    (report.target_type === 'item' ? 'Deleted Listing' : 'Deleted User');

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'reviewed':
        return '#3B82F6';
      case 'resolved':
        return '#10B981';
      case 'dismissed':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return 'time';
      case 'reviewed':
        return 'eye';
      case 'resolved':
        return 'checkmark-circle';
      case 'dismissed':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#0F1111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Report<Text style={{ color: '#007185' }}>Details</Text>
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.typeRow}>
              <Ionicons
                name={report.target_type === 'item' ? 'cube' : 'person'}
                size={20}
                color={report.target_type === 'item' ? '#8B5CF6' : '#EC4899'}
              />
              <Text style={styles.typeText}>
                Reported {report.target_type === 'item' ? 'Listing' : 'User'}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(report.status) + '15' },
              ]}
            >
              <Ionicons
                name={getStatusIcon(report.status)}
                size={14}
                color={getStatusColor(report.status)}
              />
              <Text
                style={[styles.statusText, { color: getStatusColor(report.status) }]}
              >
                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.infoGroup}>
            <Text style={styles.label}>Target</Text>
            <Text style={styles.targetName}>{targetName}</Text>
          </View>

          <View style={styles.infoGroup}>
            <Text style={styles.label}>Reason for Report</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <View
                style={{
                  width: 4,
                  height: 16,
                  backgroundColor: '#DC2626',
                  borderRadius: 2,
                  marginRight: 8,
                }}
              />
              <Text style={styles.reasonText}>{report.reason}</Text>
            </View>
          </View>

          <View style={styles.infoGroup}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.descriptionText}>
              {report.description || 'No additional details provided.'}
            </Text>
          </View>

          {report.proof_image && (
            <View style={styles.infoGroup}>
              <Text style={styles.label}>Attached Proof</Text>
              <Image
                source={{ uri: report.proof_image }}
                style={styles.proofImage}
                resizeMode="contain"
              />
            </View>
          )}

          <View style={styles.footerGroup}>
            <Text style={styles.label}>Date Submitted</Text>
            <Text style={styles.dateText}>
              {new Date(report.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

