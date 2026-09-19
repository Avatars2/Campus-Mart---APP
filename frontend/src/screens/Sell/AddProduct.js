import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Image, Modal, FlatList, Switch } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import styles from './AddProduct.styles';

export default function AddProductScreen({ navigation }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [listingType, setListingType] = useState('sell');
  const [rentalPeriod, setRentalPeriod] = useState('day');
  
  const conditions = [
    { label: 'New', value: 5 },
    { label: 'Like New', value: 4 },
    { label: 'Good', value: 3 },
    { label: 'Fair', value: 2 },
    { label: 'Poor', value: 1 },
  ];
  
  const [condition, setCondition] = useState(conditions[2]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState(null);
  
  const [imageUris, setImageUris] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [conditionModalVisible, setConditionModalVisible] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await client.get('/categories');
      setCategories(response.data);
      if (response.data.length > 0) {
        setCategory(response.data[0]);
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
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  };

  const removeImage = (index) => {
    setImageUris(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = async () => {
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
      formData.append('quantity', quantity);
      formData.append('listing_type', listingType);
      if (listingType === 'rent') formData.append('rental_period', rentalPeriod);
      formData.append('condition_rating', condition.value);
      formData.append('category_id', category.id);
      formData.append('is_active', isActive);

      if (imageUris.length > 0) {
        for (const uri of imageUris) {
          let filename = uri.split('/').pop() || 'photo.jpg';
          if (!filename.includes('.')) {
            filename += '.jpg';
          }
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;

          if (Platform.OS === 'web') {
            const response = await fetch(uri);
            const blob = await response.blob();
            formData.append('images', blob, filename);
          } else {
            formData.append('images', {
              uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
              name: filename,
              type,
            });
          }
        }
      }

      await client.post('/items', formData, {
        headers: Platform.OS === 'web' ? {} : {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      navigation.goBack();
    } catch (error) {
      console.error("Error adding item:", error);
      setErrorMsg(error.response?.data?.error || 'Failed to add item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#0F1111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add<Text style={{ color: '#007185' }}>Item</Text></Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Text style={[styles.sectionTitle, styles.sectionTitleFirst]}>Status</Text>
          <View style={styles.toggleContainer}>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleTitle}>Item Visibility</Text>
              <Text style={styles.toggleSubtitle}>Active items are visible to buyers in the marketplace.</Text>
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
              <TouchableOpacity style={styles.imageUploadBox} onPress={pickImage} activeOpacity={0.7}>
                <Ionicons name="images-outline" size={36} color="#007185" />
                <Text style={styles.imageUploadText}>Upload Photos</Text>
                <Text style={styles.imageUploadSubtext}>Add up to 5 photos of your item</Text>
              </TouchableOpacity>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageListContainer}>
                {imageUris.map((uri, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
                      <Ionicons name="close" size={16} color="#DC2626" />
                    </TouchableOpacity>
                    <Image source={{ uri }} style={styles.previewImage} />
                  </View>
                ))}
                {imageUris.length < 5 && (
                  <TouchableOpacity 
                    style={[styles.imageUploadBox, { width: 100, height: 100, marginBottom: 0 }]} 
                    onPress={pickImage} 
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={32} color="#007185" />
                  </TouchableOpacity>
                )}
              </ScrollView>
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
                onPress={() => setListingType('rent')}
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

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Quantity</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="layers-outline" size={20} color="#8792A2" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g., 1"
                placeholderTextColor="#A0A8B8"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
            </View>
          </View>

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
            onPress={handleAddItem}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>List Item</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Category Modal */}
      <Modal visible={categoryModalVisible} animationType="slide" transparent={true}>
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
      <Modal visible={conditionModalVisible} animationType="slide" transparent={true}>
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
