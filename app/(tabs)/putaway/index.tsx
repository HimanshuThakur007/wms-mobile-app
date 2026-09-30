import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/context/AuthContext';
import { useTheme } from '../../../src/context/ThemeContext';
import { useLanguage } from '../../../src/context/LanguageContext';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { GrnSelectSheet, GrnDocumentItem } from '../../../src/components/common/GrnSelectSheet';
import { DataSyncModal } from '../../../src/components/common/DataSyncModal';
import {
  getPutawayUserAssignments,
  getDocuments,
  validateBinMaster,
  syncPutawayGrnData,
} from '../../../src/services/api';
import { borderRadius, spacing } from '../../../src/constants/theme';

const monoFont = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' });

const DEFAULT_GRNS: GrnDocumentItem[] = [
  {
    id: 'grn-1',
    grn_number: 'GRN-1778',
    supplier: 'Bill: STL20260427',
    department: 'BATHROOM',
    bill_no: 'STL20260427',
    items_count: 1,
    date: '2026-06-17',
    status: 'active',
    zone: 'BATHROOM',
  },
];

export default function PutawayRegistrationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [startingPutaway, setStartingPutaway] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [grnList, setGrnList] = useState<GrnDocumentItem[]>([]);
  const [selectedGrn, setSelectedGrn] = useState<GrnDocumentItem | null>(null);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [binLocation, setBinLocation] = useState('');
  const [grnSheetOpen, setGrnSheetOpen] = useState(false);

  // Local Data Sync Modal states
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatusText, setSyncStatusText] = useState('');
  const [syncItemCount, setSyncItemCount] = useState<number | undefined>(undefined);
  const [syncComplete, setSyncComplete] = useState(false);

  useEffect(() => {
    loadGrnDocuments();
  }, [user?.id]);

  useFocusEffect(
    React.useCallback(() => {
      loadGrnDocuments();
    }, [user?.id])
  );

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadGrnDocuments();
    setRefreshing(false);
  }, [user?.id]);

  const loadGrnDocuments = async () => {
    try {
      setLoading(true);
      const userId = user?.id || 5999;
      const res = await getPutawayUserAssignments(userId);

      if (res && res.status === true && Array.isArray(res.data) && res.data.length > 0) {
        const grnMap = new Map<string, GrnDocumentItem>();
        res.data.forEach((item: any, idx: number) => {
          const grnNum = String(item.grn_number || '').trim();
          if (!grnNum) return;

          const rawDept = String(item.department || '').trim();
          const itemDepts: string[] = rawDept
            ? rawDept.split(',').map((d: string) => d.trim()).filter(Boolean)
            : [];

          if (grnMap.has(grnNum)) {
            const existing = grnMap.get(grnNum)!;
            itemDepts.forEach((d) => {
              if (d && !existing.departments?.includes(d)) {
                existing.departments?.push(d);
              }
            });
            existing.department = (existing.departments || []).join(', ');
            if (item.bill_no && !existing.bill_no) existing.bill_no = item.bill_no;
            if (item.bill_date && !existing.date) existing.date = item.bill_date;
          } else {
            const depts = itemDepts.length > 0 ? [...itemDepts] : (rawDept ? [rawDept] : []);
            grnMap.set(grnNum, {
              id: `${grnNum}-${idx}`,
              grn_number: grnNum,
              supplier: item.bill_no ? `Bill: ${item.bill_no}` : (depts.join(', ') || 'Inbound GRN'),
              department: depts.join(', ') || rawDept || 'General',
              departments: depts,
              bill_no: item.bill_no,
              user_id: item.user_id,
              items_count: 1,
              date: item.bill_date || '2026-06-17',
              status: item.status || 'active',
              zone: depts[0] || rawDept || 'General',
            });
          }
        });
        setGrnList(Array.from(grnMap.values()));
      } else {
        // Fallback to getDocuments if assignments API returns empty
        const docs = await getDocuments();
        if (Array.isArray(docs) && docs.length > 0) {
          const mapped: GrnDocumentItem[] = docs.map((d, idx) => {
            const docNum = d.document_number || `DOC-${d.id}`;
            const isGrn = docNum.toUpperCase().startsWith('GRN');
            const depts = Array.isArray(d.departments)
              ? d.departments.map(String)
              : typeof d.departments === 'string'
              ? d.departments.split(',').map((s) => s.trim()).filter(Boolean)
              : [];
            return {
              id: d.id || idx,
              grn_number: isGrn ? docNum : `GRN-${docNum.replace(/^[A-Za-z]+-?/, '')}`,
              supplier: d.organization_name || 'Inbound Supplier',
              department: depts.join(', ') || 'General',
              departments: depts,
              items_count: depts.length > 0 ? depts.length * 8 + 6 : 16,
              date: d.created_at ? d.created_at.substring(0, 10) : '2026-09-21',
              status: d.status || 'Ready',
              zone: `Zone ${String.fromCharCode(65 + (idx % 3))}`,
            };
          });
          setGrnList(mapped);
        } else {
          setGrnList(DEFAULT_GRNS);
        }
      }
    } catch (e) {
      console.log('Error loading GRN documents:', e);
      setGrnList(DEFAULT_GRNS);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGrn = (grnNum: string) => {
    if (selectedGrn?.grn_number === grnNum) {
      // In single-select putaway, tapping an already selected GRN card keeps it selected (prevents accidental deselection)
      return;
    }
    const found = grnList.find((g) => g.grn_number === grnNum);
    if (found) {
      setSelectedGrn(found);
      const depts = found.departments && found.departments.length > 0
        ? [...found.departments]
        : found.department
        ? found.department.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      setSelectedDepts(depts);
    }
  };

  const handleToggleDept = (grnNum: string, deptName: string) => {
    if (selectedGrn?.grn_number !== grnNum) {
      const found = grnList.find((g) => g.grn_number === grnNum);
      if (found) {
        setSelectedGrn(found);
        setSelectedDepts([deptName]);
      }
      return;
    }

    setSelectedDepts((prev) => {
      if (prev.includes(deptName)) {
        return prev.filter((d) => d !== deptName);
      } else {
        return [...prev, deptName];
      }
    });
  };

  const handleToggleAllDepts = () => {
    if (!selectedGrn) return;
    const allDepts = selectedGrn.departments && selectedGrn.departments.length > 0
      ? selectedGrn.departments
      : selectedGrn.department
      ? selectedGrn.department.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    if (selectedDepts.length === allDepts.length) {
      setSelectedDepts([]);
    } else {
      setSelectedDepts([...allDepts]);
    }
  };

  const handleProceedToScanning = async () => {
    if (!selectedGrn) {
      Alert.alert(
        t('Select GRN document'),
        t('Please select a GRN document to start putaway.')
      );
      return;
    }

    const trimmedBin = binLocation.trim().toUpperCase();
    if (!trimmedBin) {
      Alert.alert(
        t('Target Bin Required'),
        t('Please enter destination Bin location.')
      );
      return;
    }

    try {
      setStartingPutaway(true);
      setStatusMessage(t('Validating Bin Location...'));

      // 1. Validate Bin against master API
      const res = await validateBinMaster(trimmedBin);

      if (!res || res.status !== true) {
        Alert.alert(
          t('Invalid Bin Location'),
          res?.message || `Bin "${trimmedBin}" is not valid or not found in Bin Master.`
        );
        return;
      }

      const binData = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : (res.data || {});
      const binDept = String(binData?.department || '').trim();

      // 2. Open Data Sync Modal & fetch/cache GRN pending items locally into storage
      const activeDepts = selectedDepts.length > 0
        ? selectedDepts
        : selectedGrn.departments && selectedGrn.departments.length > 0
        ? selectedGrn.departments
        : selectedGrn.department
        ? selectedGrn.department.split(',').map((d) => d.trim()).filter(Boolean)
        : binDept
        ? [binDept]
        : [];

      if (activeDepts.length === 0) {
        Alert.alert(
          t('Department Required'),
          t('Please select at least one department for putaway.')
        );
        return;
      }

      setSyncProgress(10);
      setSyncStatusText(t('Connecting to WMS server...'));
      setSyncItemCount(undefined);
      setSyncComplete(false);
      setSyncModalVisible(true);

      try {
        await syncPutawayGrnData(
          {
            grn_number: selectedGrn.grn_number,
            vouch_date: selectedGrn.date || '2026-06-17',
            department: activeDepts,
          },
          (progress, statusText, count) => {
            setSyncProgress(progress);
            setSyncStatusText(statusText);
            if (count !== undefined && count > 0) {
              setSyncItemCount(count);
            }
          }
        );
      } catch (cacheErr) {
        console.warn('Local caching warning:', cacheErr);
      }

      setSyncComplete(true);

      // 3. Navigate to Putaway scanning screen after brief completion display
      setTimeout(() => {
        setSyncModalVisible(false);
        router.push({
          pathname: '/(tabs)/putaway/scanning',
          params: {
            grn_number: selectedGrn.grn_number,
            vouch_date: selectedGrn.date || '',
            bill_no: selectedGrn.bill_no || '',
            grn_department: activeDepts.join(', '),
            grn_departments: activeDepts.join(','),
            bin_location: trimmedBin,
            bin_department: binDept,
          },
        });
      }, 500);
    } catch (err: any) {
      console.error('Putaway setup error:', err);
      setSyncModalVisible(false);
      Alert.alert(
        t('Setup Error'),
        err?.message || t('Unable to start putaway. Please check network and try again.')
      );
    } finally {
      setStartingPutaway(false);
      setStatusMessage('');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Unified Header */}
      <AppHeader
        showBack
        onBack={() => router.back()}
        moduleTag={t('INBOUND PUTAWAY MODULE')}
        moduleTagColor={colors.violet}
        title={t('Putaway Setup')}
        subtitle={t('Inbound GRN & Bin Allocation')}
        showLogo
        showActions
        showLogout
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.violet}
            colors={[colors.violet]}
          />
        }
      >
        {/* ── Hero Instructions Card ───────────────────────────── */}
        <View
          style={[
            styles.heroBanner,
            {
              backgroundColor: colors.violetMuted,
              borderColor: `${colors.violet}40`,
            },
          ]}
        >
          <View style={[styles.heroIconBox, { backgroundColor: colors.surface }]}>
            <Ionicons name="layers" size={20} color={colors.violet} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
              {t('Putaway Allocation Form')}
            </Text>
            <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
              {t('Select inbound GRN document and assign destination Bin location for hardware laser scanning.')}
            </Text>
          </View>
        </View>

        {/* ── Main Form Card ───────────────────────────────────── */}
        <View
          style={[
            styles.formCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* 1. Single-Select GRN Field */}
          <View style={styles.formGroup}>
            <View style={styles.fieldLabelRow}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                {t('GRN DOCUMENT NUMBER')} <Text style={{ color: colors.red }}>*</Text>
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity
                  onPress={loadGrnDocuments}
                  disabled={loading}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ padding: 2 }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.violet} />
                  ) : (
                    <Ionicons name="refresh-outline" size={15} color={colors.violet} />
                  )}
                </TouchableOpacity>
                <View style={[styles.singleBadge, { backgroundColor: colors.violetMuted, borderColor: `${colors.violet}40` }]}>
                  <Text style={[styles.singleBadgeText, { color: colors.violet }]}>{t('Single-Select')}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.selectBtn,
                {
                  backgroundColor: colors.surface3,
                  borderColor: selectedGrn ? colors.violet : colors.border,
                },
              ]}
              activeOpacity={0.75}
              onPress={() => setGrnSheetOpen(true)}
            >
              <View style={styles.selectBtnLeft}>
                {loading ? (
                  <ActivityIndicator size="small" color={colors.violet} />
                ) : (
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color={selectedGrn ? colors.violet : colors.textMuted}
                  />
                )}
                <Text
                  style={[
                    styles.selectBtnText,
                    {
                      color: selectedGrn ? colors.textPrimary : colors.textMuted,
                      fontWeight: selectedGrn ? '700' : '400',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {loading
                    ? t('Loading GRN assignments...')
                    : selectedGrn
                    ? selectedGrn.grn_number
                    : `${t('Select GRN document')} (${grnList.length} ${t('available')})...`}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Selected GRN Detailed Card */}
            {selectedGrn && (() => {
              const depts: string[] =
                selectedGrn.departments && selectedGrn.departments.length > 0
                  ? selectedGrn.departments
                  : selectedGrn.department
                  ? selectedGrn.department.split(',').map((s) => s.trim()).filter(Boolean)
                  : [];

              return (
                <View style={[styles.selectedGrnCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                  <View style={styles.selectedGrnHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="document-text" size={16} color={colors.violet} />
                      <Text style={[styles.selectedGrnNum, { color: colors.textPrimary }]}>
                        {selectedGrn.grn_number}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedGrn(null);
                        setSelectedDepts([]);
                      }}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  {/* Metadata Row: Bill No & Vouch Date */}
                  <View style={styles.selectedGrnMetaRow}>
                    {selectedGrn.bill_no ? (
                      <View style={styles.detailItem}>
                        <Text style={[styles.detailItemLabel, { color: colors.textMuted }]}>{t('BILL NO')}</Text>
                        <Text style={[styles.detailItemValue, { color: colors.textPrimary }]} numberOfLines={1}>
                          {selectedGrn.bill_no}
                        </Text>
                      </View>
                    ) : null}

                    {selectedGrn.date ? (
                      <View style={styles.detailItem}>
                        <Text style={[styles.detailItemLabel, { color: colors.textMuted }]}>{t('BILL / VOUCH DATE')}</Text>
                        <Text style={[styles.detailItemValue, { color: colors.textPrimary }]}>
                          {selectedGrn.date}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Departments Section (Flex-wrapped interactive chips) */}
                  {depts.length > 0 && (
                    <View style={styles.selectedDeptsBox}>
                      <View style={styles.deptHeaderRow}>
                        <Text style={[styles.detailItemLabel, { color: colors.textMuted }]}>
                          {t('SELECT DEPARTMENTS')} ({selectedDepts.length}/{depts.length})
                        </Text>
                        {depts.length > 1 && (
                          <TouchableOpacity onPress={handleToggleAllDepts}>
                            <Text style={[styles.selectAllLinkText, { color: colors.violet }]}>
                              {selectedDepts.length === depts.length
                                ? t('Deselect All')
                                : t('Select All')}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={styles.selectedDeptChipsWrap}>
                        {depts.map((dept, dIdx) => {
                          const isDeptSelected = selectedDepts.includes(dept);

                          return (
                            <TouchableOpacity
                              key={`selected-dept-${dIdx}`}
                              style={[
                                styles.selectedDeptChip,
                                {
                                  backgroundColor: isDeptSelected
                                    ? colors.violetMuted
                                    : colors.surface3,
                                  borderColor: isDeptSelected
                                    ? `${colors.violet}60`
                                    : colors.border,
                                },
                              ]}
                              activeOpacity={0.7}
                              onPress={() => handleToggleDept(selectedGrn.grn_number, dept)}
                            >
                              <View
                                style={[
                                  styles.smallCheckbox,
                                  {
                                    backgroundColor: isDeptSelected ? colors.violet : 'transparent',
                                    borderColor: isDeptSelected ? colors.violet : colors.textMuted,
                                  },
                                ]}
                              >
                                {isDeptSelected && <Ionicons name="checkmark" size={9} color="#FFFFFF" />}
                              </View>
                              <Text
                                style={[
                                  styles.selectedDeptChipText,
                                  {
                                    color: isDeptSelected ? colors.violet : colors.textSecondary,
                                    fontWeight: isDeptSelected ? '800' : '500',
                                  },
                                ]}
                              >
                                {dept}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              );
            })()}
          </View>

          {/* Divider */}
          <View style={[styles.formDivider, { backgroundColor: colors.border }]} />

          {/* 2. Destination Bin Input Field */}
          <View style={styles.formGroup}>
            <View style={styles.fieldLabelRow}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                {t('DESTINATION BIN LOCATION')} <Text style={{ color: colors.red }}>*</Text>
              </Text>
              {binLocation ? (
                <View style={[styles.singleBadge, { backgroundColor: `${colors.emerald}18`, borderColor: `${colors.emerald}40` }]}>
                  <Text style={[styles.singleBadgeText, { color: colors.emerald }]}>{t('BIN SET')}</Text>
                </View>
              ) : null}
            </View>

            <View
              style={[
                styles.binInputWrapper,
                {
                  backgroundColor: colors.surface3,
                  borderColor: binLocation ? colors.violet : colors.border,
                },
              ]}
            >
              <Ionicons name="location" size={18} color={binLocation ? colors.violet : colors.textMuted} />
              <TextInput
                style={[styles.binTextInput, { color: colors.textPrimary }]}
                placeholder={t('Enter destination Bin (e.g. G1, BIN-A1-01)...')}
                placeholderTextColor={colors.textMuted}
                value={binLocation}
                onChangeText={setBinLocation}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {binLocation ? (
                <TouchableOpacity onPress={() => setBinLocation('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── Submit Action Button ─────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.proceedBtn,
            {
              backgroundColor: colors.violet,
              opacity: selectedGrn && selectedDepts.length > 0 && binLocation.trim() && !startingPutaway ? 1 : 0.6,
            },
          ]}
          disabled={!selectedGrn || selectedDepts.length === 0 || !binLocation.trim() || startingPutaway}
          activeOpacity={0.8}
          onPress={handleProceedToScanning}
        >
          {startingPutaway ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="barcode" size={20} color="#FFFFFF" />
          )}
          <Text style={styles.proceedBtnText} numberOfLines={1} ellipsizeMode="tail">
            {startingPutaway
              ? statusMessage || t('Preparing Putaway...')
              : `${t('Start Putaway')} (${selectedGrn?.grn_number || '1 GRN'})`}
          </Text>
          {!startingPutaway && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
        </TouchableOpacity>
      </ScrollView>

      {/* ── Reusable Single-Select GRN Sheet Modal ───────────── */}
      <GrnSelectSheet
        visible={grnSheetOpen}
        onClose={() => setGrnSheetOpen(false)}
        grns={grnList}
        selectedGrns={selectedGrn ? [selectedGrn.grn_number] : []}
        onToggleGrn={handleSelectGrn}
        singleSelect={true}
        accentColor={colors.violet}
        selectedDepts={selectedDepts}
        onToggleDept={handleToggleDept}
      />

      {/* ── Putaway GRN Local Storage Data Sync Modal ─────────── */}
      <DataSyncModal
        visible={syncModalVisible}
        documentNumber={selectedGrn?.grn_number || ''}
        progress={syncProgress}
        statusText={syncStatusText}
        itemCount={syncItemCount}
        isComplete={syncComplete}
        title={t('Syncing Inbound GRN Data')}
        completeTitle={t('GRN Items Sync Complete')}
        accentColor={colors.violet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: monoFont,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: monoFont,
    marginTop: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 40,
    gap: spacing.md,
  },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  heroIconBox: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: monoFont,
  },
  heroSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  formCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: 16,
  },
  formGroup: {
    gap: 8,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  singleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  singleBadgeText: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  selectBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  selectBtnText: {
    fontSize: 13,
    fontFamily: monoFont,
    flex: 1,
  },
  selectedGrnCard: {
    padding: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 8,
    marginTop: 2,
  },
  selectedGrnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedGrnNum: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  selectedGrnMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  detailItem: {
    gap: 2,
  },
  detailItemLabel: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  detailItemValue: {
    fontSize: 11.5,
    fontFamily: monoFont,
    fontWeight: '600',
  },
  selectedDeptsBox: {
    gap: 6,
    marginTop: 2,
  },
  deptHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectAllLinkText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  selectedDeptChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectedDeptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  selectedDeptChipText: {
    fontSize: 10.5,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  smallCheckbox: {
    width: 13,
    height: 13,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formDivider: {
    height: 1,
  },
  binInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  binTextInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '700',
    padding: 0,
  },
  proceedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: borderRadius.lg,
    marginTop: 4,
  },
  proceedBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'center',
  },
});


