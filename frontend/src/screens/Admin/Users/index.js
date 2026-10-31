import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, TouchableOpacity,
  RefreshControl, TextInput, Platform, ActionSheetIOS, Alert, ScrollView,
  Modal, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import client from '../../../api/client';
import styles from './styles';

const AVATAR_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#EC4899', '#06B6D4', '#F59E0B'];
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

export default function AdminUsersScreen() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ bottom: 80, right: 16 });
  const dropdownBtnRef = useRef(null);
  const navigation = useNavigation();

  // ── Derived pagination values ──
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredUsers.length, pageSize, currentPage]);

  const toggleDropdown = () => {
    if (dropdownVisible) {
      setDropdownVisible(false);
      return;
    }
    if (dropdownBtnRef.current?.measureInWindow) {
      dropdownBtnRef.current.measureInWindow((x, y, width, height) => {
        if (typeof x === 'number' && typeof y === 'number' && width > 0) {
          const windowHeight = Dimensions.get('window').height;
          const windowWidth = Dimensions.get('window').width;
          setDropdownPos({
            bottom: Math.max(10, windowHeight - y + 6),
            right: Math.max(16, windowWidth - (x + width)),
          });
        }
        setDropdownVisible(true);
      });
    } else {
      setDropdownVisible(true);
    }
  };

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
    const globalIndex = (currentPage - 1) * pageSize + index;
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
    if (filteredUsers.length === 0) return null;

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
    const startIdx = (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, filteredUsers.length);

    let pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages = [1, 2, 3, 4, '...', totalPages];
      } else if (currentPage >= totalPages - 2) {
        pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      } else {
        pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
      }
    }

    return (
      <View style={styles.pagination}>
        {/* ── Results Info & Page Size Dropdown in the Same Row ── */}
        <View style={styles.paginationHeaderRow}>
          <Text style={styles.pageInfo}>
            Showing {startIdx} to {endIdx} of {filteredUsers.length} users
          </Text>

          <TouchableOpacity
            ref={dropdownBtnRef}
            style={[styles.pageSizeDropdownBtn, dropdownVisible && styles.pageSizeDropdownBtnActive]}
            onPress={toggleDropdown}
            activeOpacity={0.7}
          >
            <Text style={styles.pageSizeDropdownText}>Page: {pageSize}</Text>
            <Ionicons
              name={dropdownVisible ? 'chevron-up' : 'chevron-down'}
              size={14}
              color="#007185"
            />
          </TouchableOpacity>
        </View>

        {/* ── Page Controls (Previous, Numbers, Next) ── */}
        <View style={styles.pageControls}>
          <TouchableOpacity
            style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
            disabled={currentPage === 1}
            onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={currentPage === 1 ? '#94A3B8' : '#007185'}
            />
          </TouchableOpacity>

          {pages.map((p, i) =>
            p === '...' ? (
              <Text key={`dot-${i}`} style={styles.pageDots}>
                ...
              </Text>
            ) : (
              <TouchableOpacity
                key={p}
                style={[styles.pageNumBtn, currentPage === p && styles.pageNumBtnActive]}
                onPress={() => setCurrentPage(p)}
              >
                <Text style={[styles.pageNumText, currentPage === p && styles.pageNumTextActive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            )
          )}

          <TouchableOpacity
            style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
            disabled={currentPage === totalPages}
            onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={currentPage === totalPages ? '#94A3B8' : '#007185'}
            />
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
          placeholder="Search users by name, email, or student ID..."
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

      {/* ── Anchored Page Size Dropdown Modal (Opens right at the Page button) ── */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="none"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownModalBackdrop}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View
            style={[
              styles.anchoredDropdownMenu,
              { bottom: dropdownPos.bottom, right: dropdownPos.right },
            ]}
          >
            {PAGE_SIZE_OPTIONS.map((size) => {
              const isSelected = pageSize === size;
              return (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.dropdownItem,
                    isSelected && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                    setDropdownVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      isSelected && styles.dropdownItemTextActive,
                    ]}
                  >
                    {size}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={15} color="#007185" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
