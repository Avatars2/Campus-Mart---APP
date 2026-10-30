import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, ActivityIndicator,
  TouchableOpacity, Image, RefreshControl, Modal, Pressable, Alert, TextInput, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import styles from './styles';
import useScreenRefresh from '../../hooks/useScreenRefresh';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

export default function SellScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'sale', 'rent', 'sold'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5); // 5, 10, 20, 50, 100
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ bottom: 80, right: 16 });
  const dropdownBtnRef = useRef(null);
  const [deleteModal, setDeleteModal] = useState({ visible: false, itemId: null });
  const [deleting, setDeleting] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [paymentProfile, setPaymentProfile] = useState(null);
  const [priceDropModal, setPriceDropModal] = useState({
    visible: false,
    item: null,
    discountPercent: '',
    newPrice: '',
    selectedPreset: null,
  });
  const [priceDropping, setPriceDropping] = useState(false);

  const openPriceDropModal = (item) => {
    const hasOffer = Boolean(item.original_price && item.original_price > item.price);
    const base = Number(item.original_price || item.price);
    const initialPercent = hasOffer ? String(Math.round(((base - item.price) / base) * 100)) : '';
    setPriceDropModal({
      visible: true,
      item,
      discountPercent: initialPercent,
      newPrice: hasOffer ? String(item.price) : '',
      selectedPreset: initialPercent ? Number(initialPercent) : null,
    });
  };

  const closePriceDropModal = () => {
    setPriceDropModal({ visible: false, item: null, discountPercent: '', newPrice: '', selectedPreset: null });
  };

  const handleDiscountPercentChange = (val) => {
    const clean = val.replace(/[^0-9]/g, '');
    if (!clean) {
      setPriceDropModal(prev => ({ ...prev, discountPercent: '', newPrice: '', selectedPreset: null }));
      return;
    }
    let pct = parseInt(clean, 10);
    if (pct > 99) pct = 99;
    if (pct < 1) pct = 1;
    const base = Number(priceDropModal.item?.original_price || priceDropModal.item?.price || 0);
    const calcNew = Math.max(1, Math.round(base * (1 - pct / 100)));
    setPriceDropModal(prev => ({
      ...prev,
      discountPercent: String(pct),
      newPrice: String(calcNew),
      selectedPreset: pct,
    }));
  };

  const handleNewPriceChange = (val) => {
    const clean = val.replace(/[^0-9]/g, '');
    if (!clean) {
      setPriceDropModal(prev => ({ ...prev, newPrice: '', discountPercent: '', selectedPreset: null }));
      return;
    }
    const newP = parseInt(clean, 10);
    const base = Number(priceDropModal.item?.original_price || priceDropModal.item?.price || 0);
    let pct = '';
    if (newP < base && newP > 0) {
      pct = String(Math.round(((base - newP) / base) * 100));
    }
    setPriceDropModal(prev => ({
      ...prev,
      newPrice: clean,
      discountPercent: pct,
      selectedPreset: pct ? Number(pct) : null,
    }));
  };

  const applyQuickDiscount = (percent) => {
    if (!priceDropModal.item) return;
    const base = Number(priceDropModal.item.original_price || priceDropModal.item.price);
    const discounted = Math.max(1, Math.round(base * (1 - percent / 100)));
    setPriceDropModal(prev => ({
      ...prev,
      discountPercent: String(percent),
      newPrice: String(discounted),
      selectedPreset: percent,
    }));
  };

  const handlePriceDropSubmit = async () => {
    const { item, discountPercent, newPrice } = priceDropModal;
    const pctNum = Number(discountPercent);
    const priceNum = Number(newPrice);
    const basePrice = Number(item.original_price || item.price);

    if (!pctNum || pctNum < 1 || pctNum > 99) {
      Alert.alert('Invalid Discount', 'Please enter a discount percentage between 1% and 99%.');
      return;
    }
    if (!priceNum || priceNum >= basePrice) {
      Alert.alert('Price Drop Alert', 'New price must be lower than original price (₹' + basePrice + ').');
      return;
    }

    setPriceDropping(true);
    try {
      const res = await client.post('/items/' + (item.id || item._id) + '/price-drop', {
        discount_percent: pctNum,
      });

      const updatedNewPrice = res.data.new_price || priceNum;
      const updatedOrigPrice = res.data.original_price || basePrice;

      setItems(prev => prev.map(i => {
        if (String(i.id || i._id) === String(item.id || item._id)) {
          return {
            ...i,
            price: updatedNewPrice,
            original_price: updatedOrigPrice,
          };
        }
        return i;
      }));
      closePriceDropModal();
      Alert.alert(
        '🏷️ Price Drop Alert Sent!',
        `Price updated to ₹${updatedNewPrice} (${res.data.discount_percent}% OFF)!\n\n${res.data.notified_count} student(s) who wishlisted this item have been alerted in real-time.`
      );
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to update price drop.';
      Alert.alert('Price Drop Error', msg);
    } finally {
      setPriceDropping(false);
    }
  };

  const handleRemoveOffer = async () => {
    const { item } = priceDropModal;
    if (!item) return;

    setPriceDropping(true);
    try {
      const res = await client.post('/items/' + (item.id || item._id) + '/price-drop', {
        action: 'reset',
      });

      const restoredPrice = res.data.item?.price || item.original_price || item.price;
      setItems(prev => prev.map(i => {
        if (String(i.id || i._id) === String(item.id || item._id)) {
          return {
            ...i,
            price: restoredPrice,
            original_price: null,
          };
        }
        return i;
      }));
      closePriceDropModal();
      Alert.alert(
        '✅ Offer Removed',
        `Discount offer removed. The item is now restored to its original price of ₹${restoredPrice}.`
      );
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to remove discount offer.';
      Alert.alert('Error', msg);
    } finally {
      setPriceDropping(false);
    }
  };

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

  // ── Filter & Pagination Logic ──
  const isItemSold = (item) => Boolean(
    item.marked_sold_at ||
    item.status === 'sold' ||
    (item.listing_type !== 'rent' && typeof item.quantity === 'number' && item.quantity <= 0)
  );

  const saleCount = useMemo(
    () => items.filter((i) => i.listing_type !== 'rent' && !isItemSold(i)).length,
    [items]
  );
  const rentCount = useMemo(
    () => items.filter((i) => i.listing_type === 'rent').length,
    [items]
  );
  const soldCount = useMemo(
    () => items.filter((i) => isItemSold(i)).length,
    [items]
  );

  const filteredItems = useMemo(() => {
    if (activeTab === 'sale') {
      return items.filter((i) => i.listing_type !== 'rent' && !isItemSold(i));
    }
    if (activeTab === 'rent') {
      return items.filter((i) => i.listing_type === 'rent');
    }
    if (activeTab === 'sold') {
      return items.filter((i) => isItemSold(i));
    }
    return items;
  }, [items, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Reset to page 1 whenever filter or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, pageSize]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredItems.length / pageSize));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredItems.length, pageSize, currentPage]);

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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

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
        const newTotalPages = Math.max(1, Math.ceil(newItems.length / pageSize));
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

    let statusText = 'Active';
    let statusBg = '#F0FDF4';
    let statusColor = '#16A34A';

    if (item.is_suspended) {
      statusText = 'Suspended';
      statusBg = '#FEE2E2';
      statusColor = '#DC2626';
    } else if (item.is_currently_rented) {
      statusText = 'Rented';
      statusBg = '#FEF3C7';
      statusColor = '#D97706';
    } else if (item.marked_sold_at || (item.listing_type !== 'rent' && item.quantity <= 0)) {
      statusText = 'Sold';
      statusBg = '#FEF2F2';
      statusColor = '#DC2626';
    } else if (!item.is_active) {
      statusText = 'Hidden';
      statusBg = '#F3F4F6';
      statusColor = '#6B7280';
    }

    const conditionLabel =
      { 5: 'New', 4: 'Like New', 3: 'Good', 2: 'Fair', 1: 'Poor' }[item.condition_rating] ||
      String(item.condition_rating).replace('_', ' ');

    const hasOffer = Boolean(item.original_price && item.original_price > item.price);
    const discountPct = hasOffer ? Math.round(((item.original_price - item.price) / item.original_price) * 100) : 0;

    return (
      <View style={[styles.itemCard, item.is_suspended && { opacity: 0.75 }]}>
        <View style={styles.cardTop}>
          <Image source={{ uri: imageUrl }} style={styles.itemImage} />
          <View style={styles.itemDetails}>
            <Text style={[styles.itemName, item.is_suspended && { textDecorationLine: 'line-through' }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.itemCategory}>{item.category_name}</Text>
            {hasOffer ? (
              <View style={styles.priceRowListing}>
                <Text style={styles.itemPrice}>
                  ₹{item.price}
                  {item.listing_type === 'rent' ? ` / ${item.rental_period || 'day'}` : ''}
                </Text>
                <Text style={styles.originalPriceStrikethrough}>
                  ₹{item.original_price}
                </Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>🔥 {discountPct}% OFF</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.itemPrice}>
                ₹{item.price}
                {item.listing_type === 'rent' ? ` / ${item.rental_period || 'day'}` : ''}
              </Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.cardActions}>
          {!item.is_suspended && (
            <Pressable
              style={styles.editBtn}
              onPress={() => {
                navigation.navigate('EditProduct', { item });
              }}
              android_ripple={{ color: '#E0F2FE' }}
            >
              <Ionicons
                name="pencil-outline"
                size={16}
                color="#007185"
              />
              <Text style={styles.editBtnText}>Edit</Text>
            </Pressable>
          )}
          {statusText === 'Active' && !item.is_suspended && (
            <Pressable
              style={[styles.dropPriceBtn, hasOffer && { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}
              onPress={() => openPriceDropModal(item)}
              android_ripple={{ color: '#FEF3C7' }}
            >
              <Ionicons name="pricetag-outline" size={15} color={hasOffer ? '#B45309' : '#D97706'} />
              <Text style={[styles.dropPriceBtnText, hasOffer && { color: '#B45309', fontWeight: '700' }]}>
                {hasOffer ? `${discountPct}% OFF` : 'Drop Price'}
              </Text>
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
    if (filteredItems.length === 0) return null;

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
    const startIdx = (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, filteredItems.length);

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
            Showing {startIdx} to {endIdx} of {filteredItems.length} listings
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
                style={[
                  styles.pageNumBtn,
                  currentPage === p && styles.pageNumBtnActive,
                ]}
                onPress={() => setCurrentPage(p)}
              >
                <Text
                  style={[
                    styles.pageNumText,
                    currentPage === p && styles.pageNumTextActive,
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            )
          )}

          <TouchableOpacity
            style={[
              styles.pageBtn,
              currentPage === totalPages && styles.pageBtnDisabled,
            ]}
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

      {/* ── Quick Price Drop Alert Modal ── */}
      <Modal
        visible={priceDropModal.visible}
        transparent
        animationType="fade"
        onRequestClose={closePriceDropModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.priceDropCard}>
            <View style={styles.priceDropHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="pricetag" size={20} color="#EA580C" />
                <Text style={styles.priceDropTitle}>Drop Price</Text>
              </View>
              <TouchableOpacity onPress={closePriceDropModal}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {(() => {
              const item = priceDropModal.item;
              if (!item) return null;
              const basePrice = Number(item.original_price || item.price);
              const hasActiveOffer = Boolean(item.original_price && item.original_price > item.price);
              const activePct = hasActiveOffer ? Math.round(((item.original_price - item.price) / item.original_price) * 100) : 0;
              const previewPrice = Number(priceDropModal.newPrice);
              const isValidPreview = Boolean(previewPrice > 0 && previewPrice < basePrice);

              return (
                <>
                  <Text style={styles.priceDropSubtitle} numberOfLines={2}>
                    "{item.name}" (Original: ₹{basePrice})
                  </Text>

                  {/* Active Offer Banner with Delete / Restore Button */}
                  {hasActiveOffer && (
                    <View style={styles.activeOfferBanner}>
                      <View>
                        <Text style={styles.activeOfferText}>🔥 Active Offer: -{activePct}% OFF</Text>
                        <Text style={{ fontSize: 11, color: '#92400E' }}>Currently selling at ₹{item.price}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeOfferBtn}
                        onPress={handleRemoveOffer}
                        disabled={priceDropping}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="trash-outline" size={13} color="#DC2626" />
                        <Text style={styles.removeOfferBtnText}>Delete Offer</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Preset Discount Chips */}
                  <Text style={styles.inputLabel}>Quick Discount Presets</Text>
                  <View style={[styles.quickDiscountRow, { flexWrap: 'wrap', marginBottom: 10 }]}>
                    {[5, 10, 15, 20, 25, 30, 40, 50].map(pct => (
                      <TouchableOpacity
                        key={pct}
                        style={[
                          styles.quickDiscountPill,
                          { minWidth: '22%', flex: 0, paddingVertical: 8, paddingHorizontal: 6, marginBottom: 6 },
                          priceDropModal.selectedPreset === pct && styles.quickDiscountPillActive
                        ]}
                        onPress={() => applyQuickDiscount(pct)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.quickDiscountPillText, priceDropModal.selectedPreset === pct && styles.quickDiscountPillTextActive]}>
                          -{pct}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Custom Percentage Input (1 to 99%) */}
                  <Text style={styles.inputLabel}>Or Enter Any Discount % (1% - 99%)</Text>
                  <View style={styles.percentInputContainer}>
                    <TextInput
                      style={styles.percentInputField}
                      placeholder="e.g. 12, 35, 70"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      maxLength={2}
                      value={priceDropModal.discountPercent}
                      onChangeText={handleDiscountPercentChange}
                    />
                    <Text style={styles.percentSymbol}>% OFF</Text>
                  </View>

                  {/* Or Enter New Price Directly */}
                  <Text style={styles.inputLabel}>Or Enter Discounted Price Directly (₹)</Text>
                  <TextInput
                    style={styles.priceDropInput}
                    placeholder={`Enter price lower than ₹${basePrice}`}
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={priceDropModal.newPrice}
                    onChangeText={handleNewPriceChange}
                  />

                  {/* Live Price Preview */}
                  {isValidPreview && (
                    <View style={styles.priceDropPreview}>
                      <View>
                        <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Original</Text>
                        <Text style={{ fontSize: 13, color: '#94A3B8', textDecorationLine: 'line-through' }}>₹{basePrice}</Text>
                      </View>
                      <Ionicons name="arrow-forward" size={16} color="#64748B" />
                      <View>
                        <Text style={{ fontSize: 11, color: '#16A34A', fontWeight: '600' }}>New Price</Text>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#16A34A' }}>₹{previewPrice}</Text>
                      </View>
                      <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#15803D' }}>
                          -{priceDropModal.discountPercent || Math.round(((basePrice - previewPrice) / basePrice) * 100)}% OFF
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Modal Actions */}
                  <View style={styles.priceDropActions}>
                    <TouchableOpacity
                      style={styles.priceDropCancelBtn}
                      onPress={closePriceDropModal}
                      disabled={priceDropping}
                    >
                      <Text style={styles.priceDropCancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.priceDropSubmitBtn, !isValidPreview && { opacity: 0.6 }]}
                      onPress={handlePriceDropSubmit}
                      disabled={priceDropping || !isValidPreview}
                    >
                      {priceDropping ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.priceDropSubmitBtnText}>Apply</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── Header ── */}
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>
          List<Text style={{ color: '#007185' }}>ings</Text>
        </Text>
      </View>

      {/* ── Type Filter Tabs (All / Sale / Rent) ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
          onPress={() => handleTabChange('all')}
          activeOpacity={0.75}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>All</Text>
          <View style={[styles.tabCountBadge, activeTab === 'all' && styles.tabCountBadgeActive]}>
            <Text style={[styles.tabCountText, activeTab === 'all' && styles.tabCountTextActive]}>
              {items.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'sale' && styles.tabBtnActive]}
          onPress={() => handleTabChange('sale')}
          activeOpacity={0.75}
        >
          <Ionicons
            name="pricetag-outline"
            size={13}
            color={activeTab === 'sale' ? '#007185' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'sale' && styles.tabTextActive]}>Sale</Text>
          <View style={[styles.tabCountBadge, activeTab === 'sale' && styles.tabCountBadgeActive]}>
            <Text style={[styles.tabCountText, activeTab === 'sale' && styles.tabCountTextActive]}>
              {saleCount}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'rent' && styles.tabBtnActive]}
          onPress={() => handleTabChange('rent')}
          activeOpacity={0.75}
        >
          <Ionicons
            name="time-outline"
            size={13}
            color={activeTab === 'rent' ? '#007185' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'rent' && styles.tabTextActive]}>Rent</Text>
          <View style={[styles.tabCountBadge, activeTab === 'rent' && styles.tabCountBadgeActive]}>
            <Text style={[styles.tabCountText, activeTab === 'rent' && styles.tabCountBadgeActive]}>
              {rentCount}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'sold' && styles.tabBtnActive]}
          onPress={() => handleTabChange('sold')}
          activeOpacity={0.75}
        >
          <Ionicons
            name="checkmark-done-circle-outline"
            size={13}
            color={activeTab === 'sold' ? '#007185' : '#64748B'}
          />
          <Text style={[styles.tabText, activeTab === 'sold' && styles.tabTextActive]}>Sold</Text>
          <View style={[styles.tabCountBadge, activeTab === 'sold' && styles.tabCountBadgeActive]}>
            <Text style={[styles.tabCountText, activeTab === 'sold' && styles.tabCountTextActive]}>
              {soldCount}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBg}>
            <Ionicons
              name={
                activeTab === 'rent'
                  ? 'time-outline'
                  : activeTab === 'sold'
                  ? 'checkmark-done-circle-outline'
                  : 'pricetag-outline'
              }
              size={44}
              color="#007185"
            />
          </View>
          <Text style={styles.emptyText}>
            {activeTab === 'rent'
              ? 'No rental listings'
              : activeTab === 'sale'
              ? 'No sale listings'
              : activeTab === 'sold'
              ? 'No sold listings'
              : 'No listings yet'}
          </Text>
          <Text style={styles.emptySubText}>
            {activeTab === 'rent'
              ? 'Start earning rental income by listing your first rental item!'
              : activeTab === 'sale'
              ? 'Start selling by adding your first sale item to the marketplace!'
              : activeTab === 'sold'
              ? 'Items that have been marked as sold will appear here.'
              : 'Start selling by adding your first item to the marketplace!'}
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={handleAddItemPress}
            disabled={checkingPayment}
            activeOpacity={0.85}
          >
            {checkingPayment
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Text style={styles.emptyButtonText}>
                  {activeTab === 'rent' ? 'Add Item for Rent' : 'Add Your First Item'}
                </Text>
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
