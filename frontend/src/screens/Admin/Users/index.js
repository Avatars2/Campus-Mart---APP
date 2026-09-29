import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import client from '../../../api/client';
import styles from './styles';

export default function AdminUsersScreen() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigation = useNavigation();

  const fetchUsers = async () => {
    try {
      const response = await client.get('/admin/users');
      setUsers(response.data);
      setFilteredUsers(response.data);
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

  const handleSuspend = async (userId, currentStatus) => {
    try {
      // Optimistic UI update
      setUsers(users.map(u => u._id === userId || u.id === userId ? { ...u, is_suspended: !currentStatus } : u));
      setFilteredUsers(filteredUsers.map(u => u._id === userId || u.id === userId ? { ...u, is_suspended: !currentStatus } : u));
      await client.put(`/admin/users/${userId}`, { is_suspended: !currentStatus });
    } catch (error) {
      console.error('Failed to update suspension status:', error);
      // Revert on failure
      fetchUsers();
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (!text) {
      setFilteredUsers(users);
    } else {
      const lower = text.toLowerCase();
      setFilteredUsers(users.filter(u => 
        u.full_name?.toLowerCase().includes(lower) || 
        u.email?.toLowerCase().includes(lower) ||
        u.student_id?.toLowerCase().includes(lower)
      ));
    }
  };

  const renderItem = ({ item }) => {
    const isSuspended = item.is_suspended;
    return (
      <View style={[styles.userCard, isSuspended && { opacity: 0.7 }]}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{item.full_name?.charAt(0)?.toUpperCase() || 'U'}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, isSuspended && { textDecorationLine: 'line-through' }]}>{item.full_name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        <View style={styles.actionsContainer}>
          <View style={[styles.roleBadge, item.role === 'admin' && styles.roleBadgeAdmin, { marginBottom: 8 }]}>
            <Text style={[styles.roleText, item.role === 'admin' && styles.roleTextAdmin]}>
              {item.role === 'admin' ? 'Admin' : 'Student'}
            </Text>
          </View>
          
          {item.role !== 'admin' && (
            <TouchableOpacity 
              style={[
                { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, alignItems: 'center' },
                isSuspended ? { backgroundColor: '#E2E8F0' } : { backgroundColor: '#FEE2E2' }
              ]} 
              onPress={() => handleSuspend(item._id || item.id, isSuspended)}
            >
              <Text style={[{ fontSize: 12, fontWeight: '600' }, isSuspended ? { color: '#64748B' } : { color: '#DC2626' }]}>
                {isSuspended ? 'Reactivate' : 'Suspend'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

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
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#1A1F36" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Users</Text>
        </View>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email or ID..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredUsers}
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
