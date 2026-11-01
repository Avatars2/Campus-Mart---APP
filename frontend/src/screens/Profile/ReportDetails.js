import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';
import getPusherClient from '../../utils/pusher';
import styles from './ReportDetails.styles';

export default function ReportDetails({ route, navigation }) {
  const { user } = useContext(AuthContext);
  const userId = user?.id || user?._id;
  const initialReport = route?.params?.report || null;
  const reportId =
    initialReport?._id ||
    initialReport?.id ||
    route?.params?.reportId ||
    route?.params?.id ||
    route?.params?.params?.reportId;

  const [report, setReport] = useState(initialReport);
  const [loading, setLoading] = useState(!initialReport && Boolean(reportId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!report && reportId) {
      let isMounted = true;
      setLoading(true);
      setError(null);
      client
        .get('/reports/my-reports')
        .then((res) => {
          if (!isMounted) return;
          const found = (res.data || []).find(
            (r) => String(r._id || r.id) === String(reportId)
          );
          if (found) {
            setReport(found);
            setError(null);
          } else {
            setError('Report details not found or report was deleted.');
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error('Error fetching report details:', err);
          setError('Unable to load report outcome details.');
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [report, reportId]);

  // Real-time listener for report moderation updates
  useEffect(() => {
    if (!userId || !reportId) return;
    const pusher = getPusherClient();
    if (!pusher) return;
    const channel = pusher.subscribe(`user-${userId}`);

    const handleReportUpdated = (data) => {
      if (data && String(data.reportId) === String(reportId)) {
        if (data.report) {
          setReport(data.report);
        } else {
          // Re-fetch report details
          client.get('/reports/my-reports').then((res) => {
            const found = (res.data || []).find((r) => String(r._id || r.id) === String(reportId));
            if (found) setReport(found);
          }).catch(() => {});
        }
      }
    };

    channel.bind('report:updated', handleReportUpdated);

    return () => {
      channel.unbind('report:updated', handleReportUpdated);
    };
  }, [userId, reportId]);

  const targetName =
    report?.target_info?.full_name ||
    report?.target_info?.name ||
    (report?.target_type === 'item' ? 'Deleted Listing' : 'Deleted User');

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

  if (loading) {
    return (
      <View style={styles.container}>
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#007185" />
          <Text style={{ marginTop: 12, color: '#64748B', fontSize: 14 }}>
            Loading report outcome...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !report) {
    return (
      <View style={styles.container}>
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Ionicons name="alert-circle-outline" size={54} color="#94A3B8" />
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: '#1E293B',
              marginTop: 12,
              textAlign: 'center',
            }}
          >
            {error || 'Unable to view report'}
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 18,
              paddingVertical: 10,
              paddingHorizontal: 20,
              backgroundColor: '#007185',
              borderRadius: 8,
            }}
            onPress={() => navigation.navigate('MyReports')}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>View All Reports</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
