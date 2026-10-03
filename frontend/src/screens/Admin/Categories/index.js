import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import client from '../../../api/client';
import styles from './styles';

export default function AdminCategoriesScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

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

  const filteredCategories = categories.filter(cat => 
    cat.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    cat.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pagedCategories = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCategories.slice(start, start + PAGE_SIZE);
  }, [filteredCategories, currentPage]);

  const renderPagination = () => {
    const totalPages = Math.ceil(filteredCategories.length / PAGE_SIZE);
    if (totalPages <= 1) return null;

    return (
      <View style={styles.pagination}>
        <Text style={styles.pageInfo}>
          Showing {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filteredCategories.length)} of {filteredCategories.length}
        </Text>
        <View style={styles.pageControls}>
          <TouchableOpacity
            style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
            onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? '#CBD5E1' : '#3B82F6'} />
          </TouchableOpacity>

          {[...Array(totalPages)].map((_, i) => {
            const pageNum = i + 1;
            if (
              pageNum === 1 || 
              pageNum === totalPages || 
              (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
            ) {
              return (
                <TouchableOpacity
                  key={pageNum}
                  style={currentPage === pageNum ? styles.pageNumBtnActive : styles.pageNumBtn}
                  onPress={() => setCurrentPage(pageNum)}
                >
                  <Text style={currentPage === pageNum ? styles.pageNumTextActive : styles.pageNumText}>
                    {pageNum}
                  </Text>
                </TouchableOpacity>
              );
            } else if (
              pageNum === currentPage - 2 || 
              pageNum === currentPage + 2
            ) {
              return <Text key={pageNum} style={styles.pageDots}>...</Text>;
            }
            return null;
          })}

          <TouchableOpacity
            style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
            onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            <Ionicons name="chevron-forward" size={16} color={currentPage === totalPages ? '#CBD5E1' : '#3B82F6'} />
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
          <ActivityIndicator size="large" color="#1E3A8A" />
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
            const globalIndex = (currentPage - 1) * PAGE_SIZE + index;
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
    </View>
  );
}
