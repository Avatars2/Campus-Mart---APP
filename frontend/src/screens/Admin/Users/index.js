import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import client from '../../../api/client';
import styles from './styles';

export default function AdminUsersScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigation = useNavigation();

  const fetchUsers = async () => {
    try {
      const response = await client.get('/admin/users');
      setUsers(response.data);
      setErrorMsg('');
    } catch (error) {
      console.error('Failed to fetch admin users:', error);
      setErrorMsg(error.response?.data?.error || 'Failed to load users.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const renderItem = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>{item.full_name?.charAt(0)?.toUpperCase() || 'U'}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.full_name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <View style={[styles.roleBadge, item.role === 'admin' && styles.roleBadgeAdmin]}>
        <Text style={[styles.roleText, item.role === 'admin' && styles.roleTextAdmin]}>
          {item.role === 'admin' ? 'Admin' : 'Student'}
        </Text>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0052CC" />
      </View>
    );
  }

  if (errorMsg && users.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); fetchUsers(); }}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1A1F36" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Users</Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item, index) => (item.id || item._id || index).toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0052CC']} />
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
