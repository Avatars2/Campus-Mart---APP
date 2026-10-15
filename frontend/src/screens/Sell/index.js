import React, { useCallback, useState, useMemo } from 'react';
import {
  View, Text, FlatList, ActivityIndicator,
  TouchableOpacity, Image, RefreshControl, Modal, Pressable, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import styles from './styles';
import useScreenRefresh from '../../hooks/useScreenRefresh';

const PAGE_SIZE = 10;

export default function SellScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteModal, setDeleteModal] = useState({ visible: false, itemId: null });
  const [deleting, setDeleting] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [paymentProfile, setPaymentProfile] = useState(null);

  const handleAddItemPress = async () => {
    if (checkingPayment) return;

    setCheckingPayment(true);
    try {
      const response = await client.get('/users/profile');
      const profile = response.data.user;

      if (profile.razorpay_account_status === 'activated') {
        navigation.navigate('AddProduct');
      } else {
        setPaymentProfile(profile);
        setPaymentRequired(true);
      }
    } catch (error) {
      console.error('Unable to check payment verification:', error);
      const message = error.response?.data?.error || 'Could not check your payment account. Please try again.';
      Alert.alert('Unable to check payment account', message);
    } finally {
      setCheckingPayment(false);
    }
  };

  const goToPaymentSettings = () => {
    setPaymentRequired(false);
    navigation.getParent()?.navigate('Profile', {
      screen: 'Payment',
      params: { profile: paymentProfile },
    });
  };

  const loadItems = useCallback(async () => {
    const response = await client.get('/items/my-items');
    return response.data;
  }, []);

  const saveItems = useCallback((value) => {
    const sortedItems = [...value].sort((a, b) => {
      if (a.is_active && !b.is_active) return -1;
      if (!a.is_active && b.is_active) return 1;
      return 0;
    });
    setItems(sortedItems);
    setCurrentPage(1); // Reset to page 1 on refresh
  }, []);

  const { loading, refreshing, error, refresh, retry } = useScreenRefresh(loadItems, saveItems);

  // ── Pagination Logic ──
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, currentPage]);

  const goToPrev = () => setCurrentPage(p => Math.max(1, p - 1));
  const goToNext = () => setCurrentPage(p => Math.min(totalPages, p + 1));

  // ── Delete Handlers ──
  const openDeleteModal = (itemId) => {
    setDeleteModal({ visible: true, itemId });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ visible: false, itemId: null });
  };

  const confirmDelete = async () => {
    const itemId = deleteModal.itemId;
    setDeleting(true);
    try {
      await client.delete(`/items/${itemId}`);
      setItems(prev => {
        const newItems = prev.filter(i => String(i.id || i._id) !== String(itemId));
        // Check if current page is now empty
        const newTotalPages = Math.max(1, Math.ceil(newItems.length / PAGE_SIZE));
        if (currentPage > newTotalPages) {
          setCurrentPage(newTotalPages);
        }
        return newItems;
      });
      closeDeleteModal();
    } catch (err) {
      console.error('Delete failed:', err);
      closeDeleteModal();
    } finally {
      setDeleting(false);
    }
  };

  const renderItem = ({ item }) => {
    const itemId = String(item.id || item._id);
    const imageUrl =
      item.images && item.images.length > 0
        ? item.images[0]
        : 'https://via.placeholder.com/100';

    let statusText = 'Sold';
    let statusBg = '#FEF2F2';
    let statusColor = '#DC2626';

    if (item.is_suspended) {
      statusText = 'Suspended';
      statusBg = '#FEE2E2';
      statusColor = '#DC2626';
    } else if (item.is_currently_rented) {
      statusText = 'Rented';
      statusBg = '#FEF3C7';
      statusColor = '#D97706';
    } else if (item.marked_sold_at || (item.listing_type !== 'rent' && item.quantity <= 0) || !item.is_active) {
      statusText = 'Sold';
      statusBg = '#FEF2F2';
      statusColor = '#DC2626';
    } else if (item.is_active) {
      statusText = 'Active';
      statusBg = '#F0FDF4';
      statusColor = '#16A34A';
    }

    const isSold = statusText === 'Sold';

    const conditionLabel =
      { 5: 'New', 4: 'Like New', 3: 'Good', 2: 'Fair', 1: 'Poor' }[item.condition_rating] ||
      String(item.condition_rating).replace('_', ' ');

    return (
      <View style={[styles.itemCard, item.is_suspended && { opacity: 0.75 }]}>
        <View style={styles.cardTop}>
          <Image source={{ uri: imageUrl }} style={styles.itemImage} />
          <View style={styles.itemDetails}>
            <Text style={[styles.itemName, item.is_suspended && { textDecorationLine: 'line-through' }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.itemCategory}>{item.category_name}</Text>
            <Text style={styles.itemPrice}>
              ₹{item.price}
              {item.listing_type === 'rent' ? ` / ${item.rental_period || 'day'}` : ''}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Text style={styles.itemCondition}>{conditionLabel}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.cardActions}>
          {!item.is_suspended && (
            <Pressable
              style={[styles.editBtn, isSold && styles.editBtnDisabled]}
              onPress={() => {
                if (!isSold) {
                  navigation.navigate('EditProduct', { item });
                }
              }}
              disabled={isSold}
              android_ripple={isSold ? null : { color: '#E0F2FE' }}
            >
              <Ionicons
                name="pencil-outline"
                size={16}
                color={isSold ? '#9CA3AF' : '#007185'}
              />
              <Text style={[styles.editBtnText, isSold && styles.editBtnDisabledText]}>Edit</Text>
            </Pressable>
          )}
          <Pressable
            style={styles.deleteBtn}
            onPress={() => openDeleteModal(itemId)}
          >
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // ── Pagination Bar Component ──
  const renderPagination = () => {
    if (items.length <= PAGE_SIZE) return null; // HIDE IF <= 1 PAGE

    const pageButtons = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

    for (let p = startPage; p <= endPage; p++) {
      pageButtons.push(p);
    }

    const startEntry = (currentPage - 1) * PAGE_SIZE + 1;
    const endEntry = Math.min(currentPage * PAGE_SIZE, items.length);

    return (
      <View style={styles.pagination}>
        <Text style={styles.pageInfo}>
          {startEntry}–{endEntry} of {items.length} listings
        </Text>

        <View style={styles.pageControls}>
          <TouchableOpacity
            style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
            onPress={goToPrev}
            disabled={currentPage === 1}
          >
            <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? '#CBD5E1' : '#007185'} />
          </TouchableOpacity>

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

          <TouchableOpacity
            style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
            onPress={goToNext}
            disabled={currentPage === totalPages}
          >
            <Ionicons name="chevron-forward" size={16} color={currentPage === totalPages ? '#CBD5E1' : '#007185'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007185" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: '#697386', marginBottom: 16 }}>Unable to load your listings.</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={retry} activeOpacity={0.8}>
          <Text style={styles.emptyButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        visible={paymentRequired}
        transparent
        animationType="fade"
        onRequestClose={() => setPaymentRequired(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.paymentModalIconWrap}>
              <Ionicons name="card-outline" size={30} color="#007185" />
            </View>
            <Text style={styles.modalTitle}>Set up Razorpay payouts</Text>
            <Text style={styles.modalMessage}>
              Complete Razorpay seller payout setup before adding an item. You can start secure onboarding from Profile → Payment.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalNoBtn}
                onPress={() => setPaymentRequired(false)}
              >
                <Text style={styles.modalNoBtnText}>Not now</Text>
              </Pressable>
              <Pressable
                style={styles.verifyPaymentBtn}
                onPress={goToPaymentSettings}
              >
                <Text style={styles.verifyPaymentBtnText}>Set up payouts</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteModal.visible}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="trash" size={32} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>Delete Listing?</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to permanently delete this item? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalNoBtn} onPress={closeDeleteModal} disabled={deleting}>
                <Text style={styles.modalNoBtnText}>No, Keep It</Text>
              </Pressable>
              <Pressable style={styles.modalYesBtn} onPress={confirmDelete} disabled={deleting}>
                {deleting
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <Text style={styles.modalYesBtnText}>Yes, Delete</Text>
                }
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Header ── */}
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>
          List<Text style={{ color: '#007185' }}>ings</Text>
        </Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="pricetag-outline" size={44} color="#007185" />
          </View>
          <Text style={styles.emptyText}>No listings yet</Text>
          <Text style={styles.emptySubText}>
            Start selling by adding your first item to the marketplace!
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={handleAddItemPress}
            disabled={checkingPayment}
            activeOpacity={0.85}
          >
            {checkingPayment
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Text style={styles.emptyButtonText}>Add Your First Item</Text>
            }
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pagedItems}
          keyExtractor={(item) => String(item.id || item._id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={['#007185']} />
          }
          ListFooterComponent={renderPagination}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddItemPress}
        disabled={checkingPayment}
        activeOpacity={0.85}
      >
        {checkingPayment
          ? <ActivityIndicator size="small" color="#FFFFFF" />
          : <Ionicons name="add" size={28} color="#FFF" />
        }
      </TouchableOpacity>
    </View>
  );
}
