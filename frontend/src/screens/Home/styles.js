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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  sortButton: {
    height: 48,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007185',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sortButtonActive: {
    backgroundColor: '#007185',
    borderColor: '#007185',
  },
  sortButtonText: {
    color: '#007185',
    fontSize: 13,
    fontWeight: '700',
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
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
    justifyContent: Platform.OS === 'web' && Dimensions.get('window').width > 768 ? 'center' : 'flex-end',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: Platform.OS === 'web' && Dimensions.get('window').width > 768 ? 16 : 0,
    borderBottomRightRadius: Platform.OS === 'web' && Dimensions.get('window').width > 768 ? 16 : 0,
    height: Platform.OS === 'web' && Dimensions.get('window').width > 768 ? '80%' : '85%',
    width: '100%',
    maxWidth: 600,
    flexDirection: 'column',
    overflow: 'hidden',
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
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  sidebarItemActive: {
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#007185', // CampusMart Teal
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#007185',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  showResultsText: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
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
    zIndex: 2,
  },
  conditionBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  cardDiscountRibbon: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#DC2626',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    zIndex: 3,
  },
  cardDiscountRibbonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  newlyAddedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    zIndex: 2,
  },
  newlyAddedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
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
  radioOuter: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioOuterActive: { borderColor: '#0052CC' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#0052CC' },

  // --- Sort Selection Modal ---
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sortModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    maxWidth: 500,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  sortModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sortModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F1111',
  },
  sortOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  sortOptionRowActive: {
    backgroundColor: '#E6F5F5',
  },
  sortOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortOptionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
  },
  sortOptionLabelActive: {
    fontWeight: '700',
    color: '#007185',
  },

  // --- Standalone Price Range Filter Modal ---
  priceModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxWidth: 420,
    padding: 22,
    ...Platform.select({
      web: { boxShadow: '0px 10px 25px rgba(0,0,0,0.15)' },
      default: { elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
    }),
  },
  priceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F1111',
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  priceInputBox: {
    flex: 1,
    height: 46,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#0F1111',
  },
  priceInputDivider: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  presetLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#E6F5F5',
    borderColor: '#007185',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#007185',
    fontWeight: '700',
  },
  priceModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  priceResetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  priceResetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  priceApplyBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#007185',
    alignItems: 'center',
  },
  priceApplyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // --- Campus Trending Carousel ---
  trendingSection: {
    paddingVertical: 14,
    backgroundColor: '#F5F6F8',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  trendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  trendingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendingTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F1111',
  },
  trendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  trendingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  trendingSubtitle: {
    fontSize: 12,
    color: '#64748B',
    paddingHorizontal: 14,
    marginTop: -8,
    marginBottom: 10,
  },
  trendingScroll: {
    paddingLeft: 14,
    paddingRight: 6,
  },
  trendingCard: {
    width: 175,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  trendingCardImageWrapper: {
    width: '100%',
    height: 110,
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  trendingCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  trendingTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(15, 17, 17, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendingTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  trendingTypePill: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendingTypePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  trendingNewlyAddedBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 4,
    zIndex: 2,
  },
  trendingNewlyAddedBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  trendingOfferBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 2,
  },
  trendingOfferBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  trendingCardBody: {
    padding: 10,
  },
  trendingCardPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F1111',
    marginBottom: 2,
  },
  trendingCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 18,
    marginBottom: 6,
  },
  trendingSellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendingSellerAvatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E2E8F0',
  },
  trendingSellerName: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
});
