import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, Image, ActivityIndicator, Alert } from 'react-native';
import styles from './AdminReportDetails.styles';
import { Ionicons } from '@expo/vector-icons';
import client from '../../../api/client';

export default function AdminReportDetails({ route, navigation }) {
  const { report: initialReport, onStatusUpdate } = route.params;
  const [report, setReport] = useState(initialReport);
  const [loading, setLoading] = useState(false);

  const targetName = report.target_info?.full_name || report.target_info?.name || 'Unknown Target';
  const reporterName = report.reporter_id?.full_name || 'Unknown User';
  const isPending = report.status === 'pending';

  const updateStatus = async (newStatus) => {
    setLoading(true);
    try {
      await client.put(`/admin/reports/${report._id || report.id}`, { status: newStatus });
      setReport({ ...report, status: newStatus });
      if (onStatusUpdate) onStatusUpdate(report._id || report.id, newStatus);
    } catch (error) {
      console.error('Failed to update status', error);
      Alert.alert('Error', 'Could not update report status.');
    } finally {
      setLoading(false);
    }
  };

  const navigateToTarget = () => {
    if (report.target_type === 'item' && report.target_info && !report.target_info.error) {
      navigation.navigate('ProductDetail', { item: report.target_info });
    } else if (report.target_type === 'user' && report.target_info && !report.target_info.error) {
      navigation.navigate('SellerStore', { sellerId: report.target_info._id || report.target_info.id });
    } else {
      Alert.alert('Unavailable', 'The target could not be loaded.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'reviewed': return '#3B82F6';
      case 'resolved': return '#10B981';
      case 'dismissed': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'time';
      case 'reviewed': return 'eye';
      case 'resolved': return 'checkmark-circle';
      case 'dismissed': return 'close-circle';
      default: return 'help-circle';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#0F1111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review<Text style={{ color: '#007185' }}>Report</Text></Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.typeRow}>
              <Ionicons name={report.target_type === 'item' ? 'cube' : 'person'} size={20} color={report.target_type === 'item' ? '#8B5CF6' : '#EC4899'} />
              <Text style={styles.typeText}>Reported {report.target_type === 'item' ? 'Listing' : 'User'}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) + '15' }]}>
              <Ionicons name={getStatusIcon(report.status)} size={14} color={getStatusColor(report.status)} />
              <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
                {report.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.infoGroup}>
            <Text style={styles.label}>Submitted By</Text>
            <Text style={styles.targetName}>{reporterName}</Text>
          </View>

          <View style={styles.infoGroup}>
            <Text style={styles.label}>Target Details</Text>
            <Text style={styles.targetName}>{targetName}</Text>
            <TouchableOpacity style={styles.inspectBtn} onPress={navigateToTarget}>
              <Ionicons name="eye-outline" size={16} color="#0052CC" />
              <Text style={styles.inspectBtnText}>Inspect Target</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoGroup}>
            <Text style={styles.label}>Reason for Report</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <View style={{ width: 4, height: 16, backgroundColor: '#DC2626', borderRadius: 2, marginRight: 8 }} />
              <Text style={styles.reasonText}>{report.reason}</Text>
            </View>
          </View>

          <View style={styles.infoGroup}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.descriptionText}>{report.description || 'No additional details provided.'}</Text>
          </View>

          {report.proof_image && (
            <View style={styles.infoGroup}>
              <Text style={styles.label}>Attached Proof</Text>
              <Image 
                source={{ uri: report.proof_image }} 
                style={{ width: '100%', height: 250, borderRadius: 8, marginTop: 8, backgroundColor: '#F3F4F6' }}
                resizeMode="contain"
              />
            </View>
          )}

          <View style={styles.footerGroup}>
            <Text style={styles.label}>Date Submitted</Text>
            <Text style={styles.dateText}>{new Date(report.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        </View>

        {isPending && (
          <View style={styles.moderationCard}>
            <Text style={styles.modTitle}>Moderation Actions</Text>
            <Text style={styles.modDesc}>Resolve this report if appropriate action was taken, or dismiss it if it is invalid.</Text>
            
            <View style={styles.modButtons}>
              <TouchableOpacity 
                style={[styles.modBtn, { backgroundColor: '#F3F4F6', flex: 1, marginRight: 8 }]}
                onPress={() => updateStatus('dismissed')}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#4B5563" size="small" /> : <Text style={{ color: '#4B5563', fontWeight: '700' }}>Dismiss Report</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modBtn, { backgroundColor: '#10B981', flex: 1, marginLeft: 8 }]}
                onPress={() => updateStatus('resolved')}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Mark Resolved</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}


