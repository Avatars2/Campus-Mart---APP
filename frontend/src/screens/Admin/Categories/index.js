import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import client from '../../../api/client';
import styles from './styles';

export default function AdminCategoriesScreen() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Categories</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0052CC" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          
          {categories.length === 0 && !errorMsg ? (
            <Text style={styles.emptyState}>No categories found.</Text>
          ) : (
            categories.map((cat) => (
              <View key={cat.id || cat._id} style={styles.categoryCard}>
                <View style={styles.iconContainer}>
                  <Ionicons name={cat.icon_url || 'grid'} size={24} color="#0052CC" />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  <Text style={styles.categoryDesc}>{cat.description}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => openEditModal(cat)} style={{ padding: 8 }}>
                    <Ionicons name="pencil" size={20} color="#697386" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteCategory(cat)} style={{ padding: 8 }}>
                    <Ionicons name="trash" size={20} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
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

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Icon Name (Ionicons)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g., basketball"
                value={newCatIcon}
                onChangeText={setNewCatIcon}
                autoCapitalize="none"
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
          <View style={[styles.modalContainer, { width: '85%', maxWidth: 400, borderRadius: 12, padding: 24 }]}>
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
