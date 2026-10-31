import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import client from '../../../api/client';
import styles from './styles';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

export default function AdminCategoriesScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ bottom: 80, right: 16 });
  const dropdownBtnRef = useRef(null);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Form State
  const [editingCatId, setEditingCatId] = useState(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('');

  const fetchCategories = async () => {
    try {
      const response = await client.get('/categories');
      setCategories(response.data);
      setErrorMsg('');
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setErrorMsg('Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
    }, [])
  );

  const openAddModal = () => {
    setEditingCatId(null);
    setNewCatName('');
    setNewCatDesc('');
    setNewCatIcon('');
    setFormError('');
    setModalVisible(true);
  };

  const openEditModal = (cat) => {
    setEditingCatId(cat.id || cat._id);
    setNewCatName(cat.name);
    setNewCatDesc(cat.description || '');
    setNewCatIcon(cat.icon_url || '');
    setFormError('');
    setModalVisible(true);
  };

  const handleDeleteCategory = (cat) => {
    setCategoryToDelete(cat);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    
    setIsSubmitting(true);
    try {
      const catId = categoryToDelete.id || categoryToDelete._id;
      await client.delete(`/admin/categories/${catId}`);
      setCategories(categories.filter(c => (c.id || c._id) !== catId));
      setDeleteModalVisible(false);
      setCategoryToDelete(null);
    } catch (error) {
      setFormError(error.response?.data?.error || "Failed to delete category.");
      // Just showing error in the modal via formError or a new error state
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!newCatName.trim()) {
      return setFormError('Category name is required.');
    }

    setIsSubmitting(true);
    try {
      if (editingCatId) {
        // Edit existing category
        const response = await client.put(`/admin/categories/${editingCatId}`, {
          name: newCatName.trim(),
          description: newCatDesc.trim(),
          icon_url: newCatIcon.trim() || null,
        });

        const updatedCategories = categories.map(cat => 
          (cat.id || cat._id) === editingCatId ? response.data.category : cat
        );
        setCategories(updatedCategories.sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        // Add new category
        const response = await client.post('/admin/categories', {
          name: newCatName.trim(),
          description: newCatDesc.trim(),
          icon_url: newCatIcon.trim() || null,
        });

        setCategories([...categories, response.data.category].sort((a, b) => a.name.localeCompare(b.name)));
      }
      
      setModalVisible(false);
    } catch (error) {
      setFormError(error.response?.data?.error || `Failed to ${editingCatId ? 'update' : 'add'} category.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => 
      cat.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      cat.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categories, searchQuery]);

  const pagedCategories = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCategories.slice(start, start + pageSize);
  }, [filteredCategories, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredCategories.length / pageSize));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredCategories.length, pageSize, currentPage]);

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

  const renderPagination = () => {
    if (filteredCategories.length === 0) return null;

    const totalPages = Math.max(1, Math.ceil(filteredCategories.length / pageSize));
    const startIdx = (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, filteredCategories.length);

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
            Showing {startIdx} to {endIdx} of {filteredCategories.length} categories
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
            onPress={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
            onPress={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Categories</Text>
            <Text style={styles.headerSubtitle}>Manage all product categories</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search categories..."
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            setCurrentPage(1);
          }}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); setCurrentPage(1); }}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Pill Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          <TouchableOpacity style={styles.tabBtnActive}>
            <Ionicons name="folder-open" size={14} color="#FFFFFF" />
            <Text style={styles.tabTextActive}>All ({categories.length})</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007185" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.scrollContent}
          data={pagedCategories}
          keyExtractor={cat => (cat.id || cat._id).toString()}
          ListHeaderComponent={errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          ListEmptyComponent={(!errorMsg && filteredCategories.length === 0) ? <Text style={styles.emptyState}>No categories found.</Text> : null}
          renderItem={({ item: cat, index }) => {
            const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
            const globalIndex = (currentPage - 1) * pageSize + index;
            const color = colors[globalIndex % colors.length];
            return (
              <View style={[styles.categoryCard, { borderLeftColor: color }]}>
                <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                  <Ionicons name="folder-open" size={24} color={color} />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  <Text style={styles.categoryDesc}>{cat.description}</Text>
                </View>
                <View style={styles.actionsContainer}>
                  <TouchableOpacity onPress={() => openEditModal(cat)} style={[styles.actionBtn, { backgroundColor: '#F1F5F9' }]}>
                    <Ionicons name="pencil" size={16} color="#475569" />
                    <Text style={[styles.actionText, { color: '#475569' }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteCategory(cat)} style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="trash" size={16} color="#DC2626" />
                    <Text style={[styles.actionText, { color: '#DC2626' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListFooterComponent={renderPagination}
        />
      )}

      {/* Add/Edit Category Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCatId ? 'Edit Category' : 'Add Category'}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#697386" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g., Sports"
                value={newCatName}
                onChangeText={setNewCatName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g., Sports and outdoor equipment"
                value={newCatDesc}
                onChangeText={setNewCatDesc}
              />
            </View>



            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <TouchableOpacity 
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>{editingCatId ? 'Save Changes' : 'Create Category'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { justifyContent: 'center', alignItems: 'center' }]}>
          <View style={[styles.modalContainer, { width: '85%', maxWidth: 400, borderRadius: 12, padding: 24, minHeight: 'auto' }]}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="warning" size={48} color="#DC2626" />
            </View>
            <Text style={[styles.modalTitle, { textAlign: 'center', marginBottom: 8 }]}>Delete Category</Text>
            <Text style={{ textAlign: 'center', color: '#4A5568', marginBottom: 24, fontSize: 16, lineHeight: 22 }}>
              Are you sure you want to delete the "{categoryToDelete?.name}" category? This action cannot be undone.
            </Text>
            
            {formError ? <Text style={[styles.errorText, { textAlign: 'center', marginBottom: 16 }]}>{formError}</Text> : null}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <TouchableOpacity 
                style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' }}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setCategoryToDelete(null);
                  setFormError('');
                }}
                disabled={isSubmitting}
              >
                <Text style={{ color: '#4A5568', fontWeight: '600', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#DC2626', alignItems: 'center' }}
                onPress={confirmDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 16 }}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
