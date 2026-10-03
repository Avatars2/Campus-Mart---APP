import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, TouchableOpacity,
  RefreshControl, TextInput, Platform, ActionSheetIOS, Alert, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import client from '../../../api/client';
import styles from './styles';

const AVATAR_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#EC4899', '#06B6D4', '#F59E0B'];
const PAGE_SIZE = 10;

export default function AdminUsersScreen() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const navigation = useNavigation();

  // ── Derived pagination values ──
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, currentPage]);

  // ── Data fetching ──
  const fetchUsers = async () => {
    try {
      const response = await client.get('/admin/users');
      const studentUsers = response.data.filter(u => u.role !== 'admin');
      setUsers(studentUsers);
      applyFiltersAndSearch(studentUsers, searchQuery, activeTab);
      setErrorMsg('');
    } catch (error) {
      console.error('Failed to fetch admin users:', error);
      setErrorMsg(error.response?.data?.error || 'Failed to load users.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchUsers(); };

  // ── Filter + Search — resets to page 1 every time ──
  const applyFiltersAndSearch = (allUsers, query, tab) => {
    let result = allUsers;
    if (tab === 'Active') result = result.filter(u => !u.is_suspended);
    else if (tab === 'Suspended') result = result.filter(u => u.is_suspended);

    if (query) {
      const lower = query.toLowerCase();
      result = result.filter(u =>
        u.full_name?.toLowerCase().includes(lower) ||
        u.email?.toLowerCase().includes(lower) ||
        u.student_id?.toLowerCase().includes(lower)
      );
    }
    setFilteredUsers(result);
    setCurrentPage(1); // always reset to page 1 when filter changes
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    applyFiltersAndSearch(users, text, activeTab);
  };

  const handleTabPress = (tab) => {
    setActiveTab(tab);
    applyFiltersAndSearch(users, searchQuery, tab);
  };

  // ── Suspend/Reactivate ──
  const handleSuspendToggle = async (user) => {
    const isSuspended = user.is_suspended;
    try {
      const updatedUsers = users.map(u =>
        (user._id && u._id === user._id) || (user.id && u.id === user.id)
          ? { ...u, is_suspended: !isSuspended }
          : u
      );
      setUsers(updatedUsers);
      applyFiltersAndSearch(updatedUsers, searchQuery, activeTab);
      await client.put(`/admin/users/${user._id || user.id}`, { is_suspended: !isSuspended });
    } catch (error) {
      console.error('Failed to update suspension status:', error);
      Alert.alert('Error', 'Failed to update user status.');
      fetchUsers();
    }
  };

  // ── Pagination helpers ──
  const goToPrev = () => setCurrentPage(p => Math.max(1, p - 1));
  const goToNext = () => setCurrentPage(p => Math.min(totalPages, p + 1));

  // ── Render each user card ──
  const renderItem = ({ item, index }) => {
    // Use global index across all filteredUsers for consistent color
    const globalIndex = (currentPage - 1) * PAGE_SIZE + index;
    const color = AVATAR_COLORS[globalIndex % AVATAR_COLORS.length];
    const isSuspended = item.is_suspended;
    const joinedDate = new Date(item.createdAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });

    return (
      <View style={[styles.userCard, { borderLeftColor: color }]}>
        <View style={[styles.avatarContainer, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{item.full_name?.charAt(0)?.toUpperCase() || 'U'}</Text>
        </View>

        <View style={[styles.userInfo, { flexShrink: 1 }]}>
          <Text style={[styles.userName, { marginBottom: 4 }]} numberOfLines={1}>{item.full_name}</Text>

          <View style={styles.emailRow}>
            <Ionicons name="mail-outline" size={12} color="#9CA3AF" style={{ marginTop: 2 }} />
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
            <Text style={styles.dateText}>Joined: {joinedDate}</Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end', marginLeft: 12, gap: 8 }}>
          <View style={[styles.badge, isSuspended ? styles.badgeSuspended : styles.badgeActive]}>
            <Ionicons
              name={isSuspended ? 'pause-circle' : 'checkmark-circle'}
              size={12}
              color={isSuspended ? '#DC2626' : '#059669'}
            />
            <Text style={[styles.badgeText, { color: isSuspended ? '#DC2626' : '#059669' }]}>
              {isSuspended ? 'Suspended' : 'Active'}
            </Text>
          </View>

          <TouchableOpacity
            style={{
              paddingHorizontal: 12, paddingVertical: 8,
              borderRadius: 8, backgroundColor: isSuspended ? '#E2E8F0' : '#FEE2E2',
              justifyContent: 'center', alignItems: 'center', width: '100%',
            }}
            onPress={() => handleSuspendToggle(item)}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: isSuspended ? '#475569' : '#DC2626' }}>
              {isSuspended ? 'Reactivate' : 'Suspend'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPagination = () => {
    if (filteredUsers.length <= PAGE_SIZE) return null;

    // Build page number buttons (show up to 5 around current page)
    const pageButtons = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

    for (let p = startPage; p <= endPage; p++) {
      pageButtons.push(p);
    }

    const startEntry = (currentPage - 1) * PAGE_SIZE + 1;
    const endEntry = Math.min(currentPage * PAGE_SIZE, filteredUsers.length);

    return (
      <View style={styles.pagination}>
        {/* Entry count */}
        <Text style={styles.pageInfo}>
          {startEntry}–{endEntry} of {filteredUsers.length} users
        </Text>

        <View style={styles.pageControls}>
          {/* Previous */}
          <TouchableOpacity
            style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
            onPress={goToPrev}
            disabled={currentPage === 1}
          >
            <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? '#CBD5E1' : '#1E3A8A'} />
          </TouchableOpacity>

          {/* Page numbers */}
          {startPage > 1 && (
            <>
              <TouchableOpacity style={styles.pageNumBtn} onPress={() => setCurrentPage(1)}>
                <Text style={styles.pageNumText}>1</Text>
              </TouchableOpacity>
              {startPage > 2 && <Text style={styles.pageDots}>…</Text>}
            </>
          )}

          {pageButtons.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.pageNumBtn, p === currentPage && styles.pageNumBtnActive]}
              onPress={() => setCurrentPage(p)}
            >
              <Text style={[styles.pageNumText, p === currentPage && styles.pageNumTextActive]}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <Text style={styles.pageDots}>…</Text>}
              <TouchableOpacity style={styles.pageNumBtn} onPress={() => setCurrentPage(totalPages)}>
                <Text style={styles.pageNumText}>{totalPages}</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Next */}
          <TouchableOpacity
            style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
            onPress={goToNext}
            disabled={currentPage === totalPages}
          >
            <Ionicons name="chevron-forward" size={16} color={currentPage === totalPages ? '#CBD5E1' : '#1E3A8A'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Users</Text>
            <Text style={styles.headerSubtitle}>Manage and monitor all registered users</Text>
          </View>
          <View style={{ width: 52 }} />
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email or ID..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsAndSort}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'All' && styles.tabBtnActive]}
            onPress={() => handleTabPress('All')}
          >
            <Ionicons name="people" size={16} color={activeTab === 'All' ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'All' && styles.tabTextActive]}>
              All ({users.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'Active' && styles.tabBtnActive]}
            onPress={() => handleTabPress('Active')}
          >
            <Ionicons name="checkmark-circle" size={16} color={activeTab === 'Active' ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'Active' && styles.tabTextActive]}>
              Active ({users.filter(u => !u.is_suspended).length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'Suspended' && styles.tabBtnActive]}
            onPress={() => handleTabPress('Suspended')}
          >
            <Ionicons name="pause-circle" size={16} color={activeTab === 'Suspended' ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'Suspended' && styles.tabTextActive]}>
              Suspended ({users.filter(u => u.is_suspended).length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : errorMsg && users.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); fetchUsers(); }}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pagedUsers}
          keyExtractor={(item, index) => (item.id || item._id || index).toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>}
          ListFooterComponent={renderPagination}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
