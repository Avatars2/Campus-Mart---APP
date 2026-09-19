const fs = require('fs');

// Update index.js
let file = 'frontend/src/screens/Profile/index.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('photoViewerVisible')) {
  // 1. Add Modal and SafeAreaView to imports
  content = content.replace(
    /import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Image, RefreshControl } from 'react-native';/,
    "import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Image, RefreshControl, Modal, SafeAreaView, TouchableWithoutFeedback } from 'react-native';"
  );

  // 2. Add state
  content = content.replace(
    /const \[profile, setProfile\] = useState\(null\);/,
    "const [profile, setProfile] = useState(null);\n  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);"
  );

  // 3. Wrap profile Image
  content = content.replace(
    /<Image\s+source=\{\{ uri: profile\.profile_photo_url \|\| 'https:\/\/via\.placeholder\.com\/150' \}\}\s+style=\{styles\.profileImage\}\s+\/>/,
    `<TouchableOpacity activeOpacity={0.8} onPress={() => setPhotoViewerVisible(true)}>
            <Image
              source={{ uri: profile.profile_photo_url || 'https://via.placeholder.com/150' }}
              style={styles.profileImage}
            />
          </TouchableOpacity>`
  );

  // 4. Add Modal
  const modalJSX = `
      {/* Full Screen Photo Viewer */}
      <Modal visible={photoViewerVisible} transparent={true} animationType="fade">
        <View style={styles.photoViewerContainer}>
          <SafeAreaView style={{ flex: 1 }}>
            <TouchableOpacity 
              style={styles.photoViewerCloseButton} 
              onPress={() => setPhotoViewerVisible(false)}
            >
              <Ionicons name="close" size={32} color="#FFF" />
            </TouchableOpacity>
            
            <TouchableWithoutFeedback onPress={() => setPhotoViewerVisible(false)}>
              <View style={styles.photoViewerContent}>
                <TouchableWithoutFeedback>
                  <Image
                    source={{ uri: profile.profile_photo_url || 'https://via.placeholder.com/150' }}
                    style={styles.photoViewerImage}
                    resizeMode="contain"
                  />
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}`;

  content = content.replace(
    /<\/View>\n  \);\n\}/,
    modalJSX
  );

  fs.writeFileSync(file, content);
}

// Update styles.js
let stylesFile = 'frontend/src/screens/Profile/styles.js';
let stylesContent = fs.readFileSync(stylesFile, 'utf8');

if (!stylesContent.includes('photoViewerContainer')) {
  stylesContent = stylesContent.replace(
    /\}\);/,
    `,
  // Photo Viewer Modal
  photoViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  photoViewerCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  photoViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerImage: {
    width: '100%',
    height: '70%',
  },
});`
  );
  fs.writeFileSync(stylesFile, stylesContent);
}

console.log('Photo viewer added.');

