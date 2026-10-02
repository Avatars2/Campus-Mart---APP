import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Modal, Dimensions } from 'react-native';
import styles from './AdminReportDetails.styles';
import { Ionicons } from '@expo/vector-icons';
import client from '../../../api/client';

export default function AdminReportDetails({ route, navigation }) {
  const { report: initialReport, onStatusUpdate } = route.params;
  const [report, setReport] = useState(initialReport);
  const [loading, setLoading] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);

  const targetName = report.target_info?.full_name || report.target_info?.name || 'Unknown Target';
  const reporterName = report.reporter_id?.full_name || 'Unknown User';
  const reporterRole = report.reporter_id?.role || 'Student';
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
      navigation.navigate('SellerStore', {
        sellerId: report.target_info._id || report.target_info.id,
        sellerName: report.target_info.full_name,
        sellerImage: report.target_info.profile_photo_url || null
      });
    } else {
      Alert.alert('Unavailable', 'The target could not be loaded.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#D97706';
      case 'resolved': return '#059669';
      case 'dismissed': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'time';
      case 'resolved': return 'checkmark-circle';
      case 'dismissed': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const getReasonColor = () => {
    const lower = (report.reason || '').toLowerCase();
    if (lower.includes('inappropriate')) return '#DC2626';
    if (lower.includes('spam')) return '#F59E0B';
    if (lower.includes('scam') || lower.includes('fraud')) return '#DC2626';
    return '#3B82F6';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Review Report</Text>
          <Text style={styles.headerSubtitle}>Check the details and take appropriate action</Text>
        </View>
        <TouchableOpacity style={styles.headerRight} onPress={navigateToTarget}>
          <Ionicons name="document-text" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Info Card */}
        <View style={styles.card}>
          {/* Type Badge + Status + Date Row */}
          <View style={styles.topRow}>
            <View style={[styles.reasonBadge, { backgroundColor: getReasonColor() + '15' }]}>
              <Ionicons name="alert-circle" size={14} color={getReasonColor()} />
              <Text style={[styles.reasonBadgeText, { color: getReasonColor() }]}>
                {report.target_type === 'item' ? 'Inappropriate Content' : 'User Report'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) + '15' }]}>
              <Ionicons name={getStatusIcon(report.status)} size={14} color={getStatusColor(report.status)} />
              <Text style={[styles.statusBadgeText, { color: getStatusColor(report.status) }]}>
                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
              </Text>
            </View>
          </View>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
            <Text style={styles.dateText}>
              {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
              {new Date(report.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          {/* Reported By + Reason */}
          <View style={styles.infoRow}>
            <View style={styles.infoColumn}>
              <View style={styles.infoIconRow}>
                <Ionicons name="person-outline" size={16} color="#9CA3AF" />
                <Text style={styles.infoLabel}>Reported By</Text>
              </View>
              <Text style={styles.infoValue}>{reporterName}</Text>
              <View style={[styles.roleBadge, { backgroundColor: reporterRole === 'admin' ? '#FCE7F3' : '#DBEAFE' }]}>
                <Text style={[styles.roleBadgeText, { color: reporterRole === 'admin' ? '#DB2777' : '#2563EB' }]}>
                  {reporterRole.charAt(0).toUpperCase() + reporterRole.slice(1)}
                </Text>
              </View>
            </View>
            <View style={styles.infoColumn}>
              <View style={styles.infoIconRow}>
                <Ionicons name="document-text-outline" size={16} color="#9CA3AF" />
                <Text style={styles.infoLabel}>Reason for Report</Text>
              </View>
              <Text style={[styles.infoValue, { fontWeight: '700' }]}>{report.reason}</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <View style={styles.infoIconRow}>
              <Ionicons name="chatbubble-outline" size={16} color="#9CA3AF" />
              <Text style={styles.infoLabel}>Description</Text>
            </View>
            <Text style={styles.descriptionText}>{report.description || 'No additional details provided.'}</Text>
          </View>

          {/* Proof Image */}
          {report.proof_image && (
            <View style={styles.proofSection}>
              <View style={styles.proofHeader}>
                <Ionicons name="attach" size={16} color="#9CA3AF" />
                <Text style={styles.infoLabel}>Attached Proof</Text>
              </View>
              <TouchableOpacity 
                style={styles.proofCard} 
                onPress={() => setImageViewerVisible(true)}
                activeOpacity={0.8}
              >
                <Image 
                  source={{ uri: report.proof_image }} 
                  style={styles.proofImageLarge}
                  resizeMode="cover"
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.proofMetaRow} 
                onPress={() => setImageViewerVisible(true)}
              >
                <Ionicons name="image-outline" size={16} color="#3B82F6" />
                <Text style={styles.proofFileName}>Proof_Image.jpg</Text>
                <Text style={styles.proofFileSize}>• JPG</Text>
                <Ionicons name="expand-outline" size={14} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Moderation Actions */}
        {isPending && (
          <View style={styles.moderationCard}>
            <View style={styles.modHeader}>
              <View style={[styles.modIconWrapper, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="shield-checkmark" size={20} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modTitle}>Moderation Actions</Text>
                <Text style={styles.modDesc}>Resolve this report if appropriate action was taken, or dismiss it if it is invalid.</Text>
              </View>
            </View>

            <View style={styles.modButtons}>
              <TouchableOpacity 
                style={styles.dismissBtn}
                onPress={() => updateStatus('dismissed')}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? <ActivityIndicator color="#4B5563" size="small" /> : (
                  <>
                    <Ionicons name="close-circle" size={18} color="#4B5563" />
                    <Text style={styles.dismissBtnText}>Dismiss Report</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.resolveBtn}
                onPress={() => updateStatus('resolved')}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.resolveBtnText}>Mark Resolved</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Already handled badge */}
        {!isPending && (
          <View style={[styles.moderationCard, { borderColor: getStatusColor(report.status) + '30' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name={getStatusIcon(report.status)} size={24} color={getStatusColor(report.status)} />
              <View>
                <Text style={[styles.modTitle, { color: getStatusColor(report.status) }]}>
                  Report {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                </Text>
                <Text style={styles.modDesc}>This report has already been handled.</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Full-Screen Image Viewer */}
      <Modal
        visible={imageViewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.92)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <TouchableOpacity 
            style={{
              position: 'absolute', top: 50, right: 20, zIndex: 10,
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.2)',
              justifyContent: 'center', alignItems: 'center',
            }}
            onPress={() => setImageViewerVisible(false)}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Image 
            source={{ uri: report.proof_image }} 
            style={{
              width: Dimensions.get('window').width - 32,
              height: Dimensions.get('window').height * 0.7,
              borderRadius: 8,
            }}
            resizeMode="contain"
          />
          
          <Text style={{ color: '#FFFFFF', fontSize: 14, marginTop: 16, opacity: 0.7 }}>
            Tap ✕ to close
          </Text>
        </View>
      </Modal>
    </View>
  );
}
