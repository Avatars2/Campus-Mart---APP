import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Image, Modal, FlatList, Switch, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import styles from './AddProduct.styles'; // Reusing AddProduct styles

export default function EditProductScreen({ route, navigation }) {
  const { item } = route.params;

  const [name, setName] = useState(item.name || '');
  const [price, setPrice] = useState(item.price ? item.price.toString() : '');
  const initialQty = (item.quantity !== undefined && item.quantity !== null) ? item.quantity.toString() : '1';
  const [quantity, setQuantity] = useState(initialQty);
  const [isActive, setIsActive] = useState(item.is_active !== false);
  const [listingType, setListingType] = useState(item.listing_type || 'sell');
  const [rentalPeriod, setRentalPeriod] = useState(item.rental_period || 'day');
  
  const conditions = [
    { label: 'New', value: 5 },
    { label: 'Like New', value: 4 },
    { label: 'Good', value: 3 },
    { label: 'Fair', value: 2 },
    { label: 'Poor', value: 1 },
  ];
  
  const [condition, setCondition] = useState(conditions.find(c => c.value === item.condition_rating) || conditions[2]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState(null);
  
  const [description, setDescription] = useState(item.description || '');
  
  const [imageUris, setImageUris] = useState(item.images || []);
  const [newImageSelected, setNewImageSelected] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isSoldItem = Boolean(
    item.marked_sold_at ||
    (item.listing_type !== 'rent' && item.quantity <= 0)
  );

  // Modals state
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [conditionModalVisible, setConditionModalVisible] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleQuantityChange = (val) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    setQuantity(cleaned);
    const num = Number(cleaned);
    if (!isNaN(num) && num > 0 && !isActive) {
      setIsActive(true);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await client.get('/categories');
      setCategories(response.data);
      if (response.data.length > 0) {
        const categoryIdStr = typeof item.category_id === 'object' 
          ? (item.category_id._id || item.category_id.id) 
          : item.category_id;
        const currentCategory = response.data.find(c => c.id === categoryIdStr);
        setCategory(currentCategory);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        alert("Permission Refused. You need to allow access to your photos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 5 - imageUris.length,
        quality: 0.8,
      });

      if (!result.canceled) {
        const newUris = result.assets.map(asset => asset.uri);
        setImageUris(prev => [...prev, ...newUris].slice(0, 5));
        setNewImageSelected(true);
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        alert("Permission Refused. You need to allow access to your camera.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImageUris(prev => [...prev, result.assets[0].uri].slice(0, 5));
        setNewImageSelected(true);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
    }
  };

  const handleAddPhoto = () => {
    if (Platform.OS === 'web') {
      const useCamera = window.confirm("Would you like to take a photo with your Camera?\n\nClick 'OK' for Camera, or 'Cancel' to choose from your Gallery.");
      if (useCamera) {
        takePhoto();
      } else {
        pickImage();
      }
      return;
    }
    Alert.alert(
      "Add Photo",
      "Choose a photo source",
      [
        { text: "Camera", onPress: takePhoto },
        { text: "Gallery", onPress: pickImage },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const removeImage = (index) => {
    setImageUris(prev => prev.filter((_, i) => i !== index));
    setNewImageSelected(true);
  };

  const makePrimary = (index) => {
    if (index === 0) return;
    setImageUris(prev => {
      const selected = prev[index];
      const remaining = prev.filter((_, i) => i !== index);
      return [selected, ...remaining];
    });
    setNewImageSelected(true);
  };

  const moveImage = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= imageUris.length) return;
    setImageUris(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIdx];
      updated[targetIdx] = temp;
      return updated;
    });
    setNewImageSelected(true);
  };

  const handleUpdateItem = async () => {
    setErrorMsg('');

    if (!name.trim()) return setErrorMsg('Item Name cannot be empty.');
    if (!description.trim()) return setErrorMsg('Description cannot be empty.');
    if (!price || isNaN(price)) return setErrorMsg('Please enter a valid price.');
    if (listingType === 'rent' && !rentalPeriod) return setErrorMsg('Please select a rental period.');
    if (!category) return setErrorMsg('Please select a category.');
    if (imageUris.length === 0) return setErrorMsg('Please add at least one photo.');

    setLoading(true);
    try {
      const formData = new FormData();
      
      formData.append('name', name);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('quantity', listingType === 'rent' ? '1' : quantity);
      formData.append('listing_type', listingType);
      if (listingType === 'rent') formData.append('rental_period', rentalPeriod);
      formData.append('condition_rating', condition.value);
      formData.append('category_id', category.id);
      formData.append('is_active', isActive);

      if (newImageSelected && imageUris.length > 0) {
        for (const uri of imageUris) {
          let filename = uri.split('/').pop() || 'photo.jpg';
          if (!filename.includes('.')) {
            filename += '.jpg';
          }
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;

          if (Platform.OS === 'web') {
            try {
              const response = await fetch(uri);
              const blob = await response.blob();
              formData.append('images', blob, filename);
            } catch (e) {
              console.log("Could not fetch old image blob, skipping", uri);
            }
          } else {
            if (!uri.startsWith('http')) {
              formData.append('images', {
                uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
                name: filename,
                type,
              });
            }
          }
        }
      }

      await client.put(`/items/${item.id}`, formData, {
        headers: Platform.OS === 'web' ? {} : {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      navigation.goBack();
    } catch (error) {
      console.error("Error updating item:", error);
      setErrorMsg(error.response?.data?.error || 'Failed to update item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#0F1111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit<Text style={{ color: '#007185' }}>Item</Text></Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {isSoldItem && (
            <View style={{
              backgroundColor: '#FEF3C7',
              borderColor: '#F59E0B',
              borderWidth: 1,
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}>
              <Ionicons name="alert-circle" size={24} color="#D97706" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#92400E' }}>
                  Restock Sold Item
                </Text>
                <Text style={{ fontSize: 12, color: '#B45309', marginTop: 2, lineHeight: 16 }}>
                  This item is currently sold out (0 in stock). Enter a quantity of 1 or more and ensure Item Visibility is ON to reactivate this listing.
                </Text>
              </View>
            </View>
          )}

          <Text style={[styles.sectionTitle, styles.sectionTitleFirst]}>Status</Text>
          <View style={styles.toggleContainer}>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleTitle}>Item Visibility</Text>
              <Text style={styles.toggleSubtitle}>
                {isActive ? 'Active: visible to buyers in marketplace.' : 'Hidden: hidden from marketplace, not sold.'}
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: "#E5E9F0", true: "#007185" }}
              thumbColor={Platform.OS === 'ios' ? "#FFF" : isActive ? "#FFF" : "#F3F5F9"}
            />
          </View>

          <Text style={styles.sectionTitle}>Photos</Text>
          <View style={styles.imageSection}>
            {imageUris.length === 0 ? (
              <TouchableOpacity style={styles.imageUploadBox} onPress={handleAddPhoto} activeOpacity={0.7}>
                <Ionicons name="images-outline" size={36} color="#007185" />
                <Text style={styles.imageUploadText}>Upload Photos</Text>
                <Text style={styles.imageUploadSubtext}>Add up to 5 photos of your item</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageListContainer}>
                  {imageUris.map((uri, index) => {
                    const isPrimary = index === 0;
                    return (
                      <View key={index} style={styles.imageContainer}>
                        <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
                          <Ionicons name="close" size={16} color="#DC2626" />
                        </TouchableOpacity>

                        {isPrimary ? (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>⭐ Cover Photo</Text>
                          </View>
                        ) : (
                          <TouchableOpacity 
                            style={styles.makePrimaryBtn} 
                            onPress={() => makePrimary(index)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.makePrimaryBtnText}>Make Primary</Text>
                          </TouchableOpacity>
                        )}

                        {index > 0 && (
                          <TouchableOpacity 
                            style={styles.imageArrowBtnLeft} 
                            onPress={() => moveImage(index, -1)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="chevron-back" size={14} color="#0F1111" />
                          </TouchableOpacity>
                        )}

                        {index < imageUris.length - 1 && (
                          <TouchableOpacity 
                            style={styles.imageArrowBtnRight} 
                            onPress={() => moveImage(index, 1)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="chevron-forward" size={14} color="#0F1111" />
                          </TouchableOpacity>
                        )}

                        <Image source={{ uri }} style={styles.previewImage} />
                      </View>
                    );
                  })}
                  {imageUris.length < 5 && (
                    <TouchableOpacity 
                      style={[styles.imageUploadBox, { width: 100, height: 100, marginBottom: 0 }]} 
                      onPress={handleAddPhoto} 
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={32} color="#007185" />
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          <Text style={styles.sectionTitle}>Basic Info</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Listing Type</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity 
                style={[
                  styles.input, 
                  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 0, 
                    borderColor: listingType === 'sell' ? '#007185' : '#E5E9F0', 
                    backgroundColor: listingType === 'sell' ? '#E6F7F9' : '#FFF' }
                ]}
                onPress={() => setListingType('sell')}
                activeOpacity={0.7}
              >
                <Text style={{ color: listingType === 'sell' ? '#007185' : '#0F1111', fontWeight: '600' }}>For Sale</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.input, 
                  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 0,
                    borderColor: listingType === 'rent' ? '#007185' : '#E5E9F0', 
                    backgroundColor: listingType === 'rent' ? '#E6F7F9' : '#FFF' }
                ]}
                onPress={() => { setListingType('rent'); setQuantity('1'); }}
                activeOpacity={0.7}
              >
                <Text style={{ color: listingType === 'rent' ? '#007185' : '#0F1111', fontWeight: '600' }}>For Rent</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Item Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="pricetag-outline" size={20} color="#8792A2" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g., Engineering Mathematics Book"
                placeholderTextColor="#A0A8B8"
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{listingType === 'rent' ? 'Rental Price (₹)' : 'Price (₹)'}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="wallet-outline" size={20} color="#8792A2" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g., 250"
                placeholderTextColor="#A0A8B8"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
            </View>
          </View>

          {listingType === 'rent' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Rental Period</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['hour', 'day', 'month'].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[styles.input, { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 0, borderColor: rentalPeriod === period ? '#007185' : '#E5E9F0', backgroundColor: rentalPeriod === period ? '#E6F7F9' : '#FFF' }]}
                    onPress={() => setRentalPeriod(period)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: rentalPeriod === period ? '#007185' : '#0F1111', fontWeight: '600' }}>Per {period}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {listingType === 'rent' ? (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Quantity</Text>
              <View style={[styles.inputWrapper, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                <Ionicons name="layers-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: '#64748B' }]}
                  value="1"
                  editable={false}
                />
              </View>
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Quantity</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="layers-outline" size={20} color="#8792A2" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 1"
                  placeholderTextColor="#A0A8B8"
                  value={quantity}
                  onChangeText={handleQuantityChange}
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>Details</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Category</Text>
            <TouchableOpacity 
              style={styles.selectorButton} 
              onPress={() => setCategoryModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.selectorContent}>
                <Ionicons name="grid-outline" size={20} color="#8792A2" style={styles.inputIcon} />
                <Text style={styles.selectorText}>{category ? category.name : 'Select Category'}</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#8792A2" />
            </TouchableOpacity>
          </View>



          <View style={styles.inputContainer}>
            <Text style={styles.label}>Condition</Text>
            <TouchableOpacity 
              style={styles.selectorButton} 
              onPress={() => setConditionModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.selectorContent}>
                <Ionicons name="sparkles-outline" size={20} color="#8792A2" style={styles.inputIcon} />
                <Text style={styles.selectorText}>{condition.label}</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#8792A2" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <Ionicons name="document-text-outline" size={20} color="#8792A2" style={[styles.inputIcon, { marginTop: 2 }]} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the item in detail..."
                placeholderTextColor="#A0A8B8"
                value={description}
                onChangeText={setDescription}
                multiline={true}
                numberOfLines={4}
              />
            </View>
          </View>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        </ScrollView>

        {/* Sticky Bottom Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={handleUpdateItem}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Update</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Category Modal */}
      <Modal visible={categoryModalVisible} animationType="slide" transparent={true} onRequestClose={() => setCategoryModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Category</Text>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isActive = category && category.id === item.id;
                return (
                  <TouchableOpacity 
                    style={[styles.modalItem, isActive && styles.modalItemActive]}
                    onPress={() => { setCategory(item); setCategoryModalVisible(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>{item.name}</Text>
                    {isActive && <Ionicons name="checkmark-circle" size={24} color="#007185" />}
                  </TouchableOpacity>
                );
              }}
              showsVerticalScrollIndicator={false}
            />
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setCategoryModalVisible(false)} activeOpacity={0.7}>
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Condition Modal */}
      <Modal visible={conditionModalVisible} animationType="slide" transparent={true} onRequestClose={() => setConditionModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Condition</Text>
            <FlatList
              data={conditions}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isActive = condition && condition.value === item.value;
                return (
                  <TouchableOpacity 
                    style={[styles.modalItem, isActive && styles.modalItemActive]}
                    onPress={() => { setCondition(item); setConditionModalVisible(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>{item.label}</Text>
                    {isActive && <Ionicons name="checkmark-circle" size={24} color="#007185" />}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setConditionModalVisible(false)} activeOpacity={0.7}>
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}
