import { StyleSheet, Dimensions, Platform } from 'react-native';
import { colors } from '../../theme/colors';

const { width } = Dimensions.get('window');
const cardWidth = (width - 36) / 2; // slightly more gap

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  // --- Header Area ---
  headerArea: {
    backgroundColor: '#F5F6F8', // Matches Amazon's top light background
    paddingTop: Platform.OS === 'ios' ? 40 : 50,
  },
  
  // 1. Top Bar (Logo & Icons)
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F1111',
    letterSpacing: -0.5,
  },
  topIconsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  iconBtn: {
    padding: 2,
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -6,
    backgroundColor: '#ED7D31', // Amazon-like orange
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },


  // 3. Search Bar
  searchWrapper: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#A6A6A6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#0F1111',
  },
  searchRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  // --- Quick Filter Bar ---
  quickFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 10,
    alignItems: 'center',
  },
  filterIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#007185', // Amazon blue
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  filterIconText: {
    color: '#007185',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4,
  },
  quickFilterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickFilterChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D5D9D9',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  quickFilterChipActive: {
    backgroundColor: '#F3F4F6',
    borderColor: '#0F1111',
  },
  quickFilterText: {
    fontSize: 13,
    color: '#0F1111',
  },
  quickFilterTextActive: {
    fontWeight: '700',
  },

  // --- Filter Modal ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '85%',
    width: '100%',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F1111',
  },
  clearAllText: {
    color: '#007185',
    fontSize: 14,
    fontWeight: '600',
  },
  modalBody: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: '35%',
    backgroundColor: '#F7F7F7',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  sidebarItem: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sidebarItemActive: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: '#007185',
  },
  sidebarItemText: {
    fontSize: 14,
    color: '#0F1111',
    fontWeight: '500',
  },
  sidebarItemTextActive: {
    fontWeight: '700',
    color: '#007185',
  },
  filterContent: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F1111',
    marginBottom: 12,
  },
  filterOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterOptionBtn: {
    borderWidth: 1,
    borderColor: '#D5D9D9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  filterOptionBtnActive: {
    borderColor: '#007185',
    backgroundColor: '#F0F8FF', // Light blue tint
  },
  filterOptionText: {
    fontSize: 13,
    color: '#0F1111',
  },
  filterOptionTextActive: {
    color: '#007185',
    fontWeight: '700',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  showResultsBtn: {
    backgroundColor: '#FFD814', // Amazon Yellow
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  showResultsText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F1111',
  },


  // 4. Location Bar
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E6F5F5', // Light teal similar to Amazon's location ribbon
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  locationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    fontSize: 13,
    color: '#0F1111',
    marginLeft: 6,
    fontWeight: '500',
  },
  primeButton: {
    backgroundColor: '#007185',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  primeButtonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // 5. Banners
  bannerScroll: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  bannerCard: {
    width: width * 0.8,
    height: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginRight: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'flex-start',
    position: 'relative',
    overflow: 'hidden',
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F1111',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#565959',
    marginBottom: 12,
  },
  bannerBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F1111',
  },


  // Product Grid
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 30,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  itemCard: {
    width: cardWidth,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D5D9D9',
    overflow: 'hidden',
  },
  itemImageContainer: {
    position: 'relative',
    backgroundColor: '#F7F7F7',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemImage: {
    width: '100%',
    height: cardWidth, // Square image
    resizeMode: 'contain',
  },
  conditionBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#ED7D31', // Orange badge
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomRightRadius: 8,
  },
  conditionBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  itemDetails: {
    padding: 10,
  },
  itemName: {
    fontSize: 13,
    color: '#0F1111',
    lineHeight: 18,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F1111',
    marginBottom: 2,
  },
  primeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#007185',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sellerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sellerAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 6,
    backgroundColor: '#E5E9F0',
  },
  sellerName: {
    fontSize: 11,
    color: '#565959',
    flex: 1,
  },

  // States
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 40,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F1111',
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 14,
    color: '#565959',
    textAlign: 'center',
    lineHeight: 20,
  },
});
