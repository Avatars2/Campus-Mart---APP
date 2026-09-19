import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  
  // Header Info
  topHeaderContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  storeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  storeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  storeNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F1111',
  },
  visitStoreText: {
    fontSize: 14,
    color: '#007185', // Amazon blue link
    marginLeft: 32,
  },
  ratingSummaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingStarsTop: {
    color: '#DE7921',
    fontSize: 14,
    marginRight: 4,
  },
  ratingValueTop: {
    color: '#0F1111',
    fontSize: 14,
  },
  productTitle: {
    fontSize: 16,
    color: '#0F1111',
    lineHeight: 22,
    marginBottom: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#0F1111',
    fontWeight: '600',
    marginBottom: 8,
  },

  // Carousel
  carouselContainer: {
    width: width,
    height: width,
    backgroundColor: '#FFFFFF',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  carouselImage: {
    width: width,
    height: width,
    resizeMode: 'contain',
  },
  imageCounter: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  imageCounterText: {
    color: '#0F1111',
    fontSize: 12,
    fontWeight: '700',
  },
  wishlistButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D5D9D9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Price & Buying Section
  buySection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#0F1111',
    marginTop: 4,
    marginRight: 2,
  },
  priceText: {
    fontSize: 32,
    fontWeight: '500',
    color: '#0F1111',
  },
  rentalPeriodText: {
    fontSize: 16,
    color: '#565959',
    marginTop: 14,
    marginLeft: 4,
  },
  
  // Amazon-style Buttons
  actionButtonYellow: {
    backgroundColor: '#FFD814',
    paddingVertical: 14,
    borderRadius: 100, // Pill shape
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FCD200',
  },
  actionButtonYellowText: {
    color: '#0F1111',
    fontSize: 16,
    fontWeight: '500',
  },
  actionButtonOrange: {
    backgroundColor: '#FFA41C',
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF8F00',
  },
  actionButtonOrangeText: {
    color: '#0F1111',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.5,
  },
  
  // Extra Info
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#007185',
    marginLeft: 8,
  },

  // Description
  divider: {
    height: 4,
    backgroundColor: '#E5E7EB',
    width: '100%',
  },
  descriptionSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F1111',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#0F1111',
    lineHeight: 22,
  },
  
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 12,
    color: '#0F1111',
    fontWeight: '500',
  },

  // Seller Card
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 16,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F1111',
  },
  sellerSubtitle: {
    fontSize: 12,
    color: '#565959',
    marginTop: 2,
  },
});
