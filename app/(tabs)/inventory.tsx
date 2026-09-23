import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { BrandLogo } from '../../src/components/common/BrandLogo';
import { HeaderActions } from '../../src/components/common/HeaderActions';
import { borderRadius, spacing } from '../../src/constants/theme';

const MOCK_INVENTORY = [
  { id: 'SKU-9901', name: 'Industrial Servo Motors', category: 'Machinery', location: 'Aisle 3, Rack B', qty: 142, status: 'In Stock' },
  { id: 'SKU-8842', name: 'High-Temp Thermal Sensors', category: 'Electronics', location: 'Aisle 7, Bin 12', qty: 24, status: 'Low Stock' },
  { id: 'SKU-7721', name: 'Hydraulic Seal Kits (XL)', category: 'Pneumatics', location: 'Aisle 1, Rack D', qty: 380, status: 'In Stock' },
  { id: 'SKU-6610', name: 'Precision Calibrators', category: 'Tools', location: 'Aisle 9, Cabinet 4', qty: 5, status: 'Low Stock' },
  { id: 'SKU-5509', name: 'Heavy-Duty Conveyor Belts', category: 'Spares', location: 'Zone C, Bulk Area', qty: 68, status: 'In Stock' },
];

const monoFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');

  const filtered = MOCK_INVENTORY.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BrandLogo size={32} rounded />
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Inventory & Stock</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Warehouse SKU tracking</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <HeaderActions />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => Alert.alert('Add Stock', 'Opening SKU intake form.')}
          >
            <Ionicons name="add" size={20} color="#0B0F14" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search by SKU, item name, aisle..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Inventory List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listCountRow}>
          <Text style={[styles.countText, { color: colors.textMuted }]}>SHOWING {filtered.length} SKUs</Text>
          <Text style={[styles.filterLink, { color: colors.primary }]}>Filter by Zone</Text>
        </View>

        {filtered.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                item.name,
                `SKU: ${item.id}\nCategory: ${item.category}\nLocation: ${item.location}\nAvailable: ${item.qty} units`
              )
            }
          >
            <View style={styles.itemHeader}>
              <View style={[styles.skuTag, { backgroundColor: colors.primaryMuted }]}>
                <Text style={[styles.skuTagText, { color: colors.primary }]}>{item.id}</Text>
              </View>
              <View
                style={[
                  styles.badge,
                  item.status === 'In Stock'
                    ? { backgroundColor: colors.primaryMuted, borderColor: `${colors.primary}30` }
                    : { backgroundColor: colors.amberMuted, borderColor: `${colors.amber}30` },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: item.status === 'In Stock' ? colors.primary : colors.amber },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </View>

            <Text style={[styles.itemName, { color: colors.textPrimary }]}>{item.name}</Text>

            <View style={[styles.itemFooter, { borderTopColor: colors.border }]}>
              <View style={styles.footerItem}>
                <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                <Text style={[styles.footerText, { color: colors.textMuted }]}>{item.location}</Text>
              </View>
              <Text style={[styles.qtyText, { color: colors.textPrimary }]}>{item.qty} Units</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '600',
    marginTop: 2,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    height: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 36,
  },
  listCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  countText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  filterLink: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  itemCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md + 2,
    marginBottom: spacing.sm + 2,
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  skuTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  skuTagText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '600',
  },
  qtyText: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '900',
  },
});
