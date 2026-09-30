import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/context/AuthContext';
import { useTheme } from '../../../src/context/ThemeContext';
import { useLanguage } from '../../../src/context/LanguageContext';
import { AppHeader } from '../../../src/components/common/AppHeader';
import { DocumentSelectSheet } from '../../../src/components/common/DocumentSelectSheet';
import { DepartmentSelectSheet } from '../../../src/components/common/DepartmentSelectSheet';
import { DataSyncModal } from '../../../src/components/common/DataSyncModal';
import { syncDocumentScanningData } from '../../../src/services/localScanningCache';
import { useDocumentRegistrationSession } from '../../../src/hooks/useDocumentRegistrationSession';
import { borderRadius, spacing, monoFont } from '../../../src/constants/theme';

export default function ContainerRegistrationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const userId = user?.id ? Number(user.id) : 1;
  const userName = user?.name || 'Operator';

  const session = useDocumentRegistrationSession({
    userId,
    userName,
    defaultTab: (params.tab as 'register' | 'scan') || 'register',
    fallbackDepts: ['Container Freight', 'Pallet Tier Stacking', 'Cold Storage Bay'],
  });

  useFocusEffect(
    React.useCallback(() => {
      session.loadData();
    }, [session.loadData])
  );

  const registeredDocs = useMemo(() => {
    const map = new Map<
      string,
      { doc_no: string; organization_name: string; departments: string[] }
    >();

    session.registrations.forEach((r) => {
      const docNo = r.doc_no || r.document_number || '';
      if (!docNo) return;
      if (!map.has(docNo)) {
        map.set(docNo, {
          doc_no: docNo,
          organization_name: r.organization_name || 'Organization',
          departments: [],
        });
      }
      const entry = map.get(docNo)!;
      const dept = r.department || 'Container';
      if (!entry.departments.includes(dept)) {
        entry.departments.push(dept);
      }
    });

    return Array.from(map.values());
  }, [session.registrations]);

  const scanRows = useMemo(() => {
    const q = session.scanSearch.toLowerCase().trim();
    const rows: { id: string; doc_no: string; organization_name: string; department: string }[] = [];

    registeredDocs.forEach((d) => {
      d.departments.forEach((dept) => {
        if (!q || d.doc_no.toLowerCase().includes(q) || dept.toLowerCase().includes(q) || d.organization_name.toLowerCase().includes(q)) {
          rows.push({
            id: `${d.doc_no}__${dept}`,
            doc_no: d.doc_no,
            organization_name: d.organization_name,
            department: dept,
          });
        }
      });
    });

    return rows;
  }, [registeredDocs, session.scanSearch]);

  const selectedScanRows = useMemo(() => {
    return scanRows.filter((r) => session.selectedScanRowIds.includes(r.id));
  }, [scanRows, session.selectedScanRowIds]);

  const isAllScanRowsSelected = useMemo(() => {
    return scanRows.length > 0 && scanRows.every((r) => session.selectedScanRowIds.includes(r.id));
  }, [scanRows, session.selectedScanRowIds]);

  const handleStartScan = async () => {
    if (selectedScanRows.length === 0) return;
    const docNos = Array.from(new Set(selectedScanRows.map((r) => r.doc_no)));
    const orgName = selectedScanRows[0]?.organization_name || 'Organization';
    const depts = Array.from(new Set(selectedScanRows.map((r) => r.department))).join(',');
    const primaryDocNo = docNos.join(', ');

    try {
      await Promise.all(docNos.map((docNo) => session.startDataSync(docNo)));
      router.push({
        pathname: '/(tabs)/packing/container-scanning',
        params: {
          document_number: primaryDocNo,
          organization_name: orgName,
          departments: depts,
          user_id: String(userId),
        },
      });
    } catch (err) {
      console.error('Container data sync error:', err);
      router.push({
        pathname: '/(tabs)/packing/container-scanning',
        params: {
          document_number: primaryDocNo,
          organization_name: orgName,
          departments: depts,
          user_id: String(userId),
        },
      });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Unified Header */}
      <AppHeader
        showBack
        moduleTag={t('CONTAINER LOADING MODULE')}
        moduleTagColor={colors.amber}
        title={t('Container Packing')}
        showLogo
        showActions
      />

      {/* Tabs */}
      <View style={styles.tabBar}>
        <View style={[styles.tabTrack, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              session.tab === 'register' && { backgroundColor: colors.amber },
            ]}
            onPress={() => session.handleTabSwitch('register')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="create-outline"
              size={16}
              color={session.tab === 'register' ? '#0B0F14' : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabBtnText,
                { color: session.tab === 'register' ? '#0B0F14' : colors.textSecondary },
              ]}
            >
              {t('Register')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              session.tab === 'scan' && { backgroundColor: colors.amber },
            ]}
            onPress={() => session.handleTabSwitch('scan')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="boat-outline"
              size={16}
              color={session.tab === 'scan' ? '#0B0F14' : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabBtnText,
                { color: session.tab === 'scan' ? '#0B0F14' : colors.textSecondary },
              ]}
            >
              {t('Scan Container')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {session.tab === 'register' ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={session.refreshing}
              onRefresh={session.onRefresh}
              tintColor={colors.amber}
              colors={[colors.amber]}
            />
          }
        >
          <View
            style={[
              styles.bannerBox,
              {
                backgroundColor: colors.amberMuted,
                borderColor: `${colors.amber}30`,
              },
            ]}
          >
            <View style={[styles.bannerIconWrap, { backgroundColor: colors.surface }]}>
              <Ionicons name="boat" size={16} color={colors.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>
                {t('Container Registration')}
              </Text>
              <Text style={[styles.bannerSub, { color: colors.textMuted }]}>
                {t('Register container documents for freight & pallet loading')}
              </Text>
            </View>
          </View>

          {session.regSuccess ? (
            <View style={[styles.successBox, { backgroundColor: `${colors.emerald}20`, borderColor: `${colors.emerald}40` }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.emerald} />
              <Text style={[styles.successText, { color: colors.emerald }]}>{session.regSuccess}</Text>
            </View>
          ) : null}

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('Container Document')}</Text>

            <TouchableOpacity
              style={[
                styles.selectInput,
                {
                  backgroundColor: colors.surface2,
                  borderColor: session.selectedDoc ? colors.amber : colors.border,
                },
              ]}
              onPress={() => session.setDocSheetOpen(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text-outline" size={18} color={session.selectedDoc ? colors.amber : colors.textMuted} />
              <Text style={[styles.selectInputText, { color: session.selectedDoc ? colors.textPrimary : colors.textMuted }]}>
                {session.selectedDoc ? (session.selectedDoc.doc_no || session.selectedDoc.document_number) : t('Select Container Document...')}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <Text style={[styles.cardTitle, { color: colors.textPrimary, marginTop: 16 }]}>{t('Department / Freight Zone')}</Text>

            <TouchableOpacity
              style={[
                styles.selectInput,
                {
                  backgroundColor: colors.surface2,
                  borderColor: session.selectedDepts.length > 0 ? colors.amber : colors.border,
                },
              ]}
              onPress={() => session.setDeptSheetOpen(true)}
              activeOpacity={0.7}
              disabled={!session.selectedDoc}
            >
              <Ionicons name="albums-outline" size={18} color={session.selectedDepts.length > 0 ? colors.amber : colors.textMuted} />
              <Text style={[styles.selectInputText, { color: session.selectedDepts.length > 0 ? colors.textPrimary : colors.textMuted }]}>
                {session.selectedDepts.length > 0 ? `${session.selectedDepts.length} ${t('Department(s) selected')}` : t('Select Department(s)...')}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.amber },
                (!session.selectedDoc || session.selectedDepts.length === 0 || session.registering) && styles.btnDisabled,
              ]}
              onPress={session.handleRegister}
              disabled={!session.selectedDoc || session.selectedDepts.length === 0 || session.registering}
            >
              {session.registering ? (
                <ActivityIndicator size="small" color="#0B0F14" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#0B0F14" />
                  <Text style={styles.primaryBtnText}>{t('Register Container')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder={t('Search container document or freight bay...')}
              placeholderTextColor={colors.textMuted}
              value={session.scanSearch}
              onChangeText={session.setScanSearch}
            />
          </View>

          {scanRows.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="boat-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('No registered containers found for loading.')}</Text>
            </View>
          ) : (
            <>
              {/* Select All Toggle Bar */}
              <TouchableOpacity
                style={[
                  styles.selectAllRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => session.toggleAllScanRows(scanRows.map((r) => r.id))}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: isAllScanRowsSelected ? colors.amber : 'transparent',
                      borderColor: isAllScanRowsSelected ? colors.amber : colors.border,
                    },
                  ]}
                >
                  {isAllScanRowsSelected && <Ionicons name="checkmark" size={14} color="#0B0F14" />}
                </View>
                <Text style={[styles.selectAllText, { color: colors.textPrimary }]}>
                  {isAllScanRowsSelected ? t('Deselect All Documents') : t('Select All Documents')}
                </Text>
                <Text style={[styles.countBadge, { color: colors.textMuted }]}>
                  {selectedScanRows.length}/{scanRows.length}
                </Text>
              </TouchableOpacity>

              {/* Document Checkbox Items */}
              {scanRows.map((row) => {
                const isSelected = session.selectedScanRowIds.includes(row.id);

                return (
                  <TouchableOpacity
                    key={row.id}
                    style={[
                      styles.scanRowCard,
                      {
                        backgroundColor: isSelected ? colors.amberMuted : colors.surface,
                        borderColor: isSelected ? colors.amber : colors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => session.toggleScanRow(row.id)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: isSelected ? colors.amber : 'transparent',
                          borderColor: isSelected ? colors.amber : colors.border,
                        },
                      ]}
                    >
                      {isSelected && <Ionicons name="checkmark" size={14} color="#0B0F14" />}
                    </View>

                    <View style={styles.scanRowContent}>
                      <Text style={[styles.docNoText, { color: colors.textPrimary }]}>{row.doc_no}</Text>
                      <Text style={[styles.deptText, { color: colors.textSecondary }]}>{row.department}</Text>
                    </View>
                    {row.organization_name ? (
                      <Text style={[styles.orgText, { color: colors.textMuted }]}>{row.organization_name}</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {selectedScanRows.length > 0 && (
            <TouchableOpacity style={[styles.startScanBtn, { backgroundColor: colors.amber }]} onPress={handleStartScan}>
              <Ionicons name="boat" size={18} color="#0B0F14" />
              <Text style={styles.startScanBtnText}>
                {t('Start Container Loading')} ({selectedScanRows.length})
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Sheets & Modals */}
      <DocumentSelectSheet
        visible={session.docSheetOpen}
        documents={session.documents}
        onSelectDocument={session.handleSelectDoc}
        onClose={() => session.setDocSheetOpen(false)}
      />

      <DepartmentSelectSheet
        visible={session.deptSheetOpen}
        departments={session.availableDepts}
        selectedDepartments={session.selectedDepts}
        onToggleDepartment={session.toggleDept}
        onToggleAll={session.toggleAllDepts}
        onClose={() => session.setDeptSheetOpen(false)}
      />

      <DataSyncModal
        visible={session.syncModalVisible}
        documentNumber={session.syncDocNo}
        progress={session.syncProgress}
        statusText={session.syncStatusText}
        itemCount={session.syncItemCount}
        isComplete={session.syncComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { borderBottomWidth: 1, paddingHorizontal: spacing.lg, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtnText: { fontSize: 13, fontWeight: '600' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontFamily: monoFont, fontWeight: '700' },
  title: { fontSize: 20, fontFamily: monoFont, fontWeight: '800' },
  tabBar: { paddingHorizontal: spacing.lg, marginVertical: 12 },
  tabTrack: { flexDirection: 'row', borderRadius: borderRadius.md, borderWidth: 1, padding: 4 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: borderRadius.sm, gap: 6 },
  tabBtnText: { fontSize: 13, fontFamily: monoFont, fontWeight: '700' },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  bannerBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: borderRadius.md, borderWidth: 1, gap: 10, marginBottom: 16 },
  bannerIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontSize: 13, fontFamily: monoFont, fontWeight: '800' },
  bannerSub: { fontSize: 11, fontFamily: monoFont, marginTop: 2 },
  successBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: borderRadius.md, borderWidth: 1, gap: 8, marginBottom: 16 },
  successText: { fontSize: 12, fontFamily: monoFont, fontWeight: '700' },
  card: { padding: 16, borderRadius: borderRadius.md, borderWidth: 1 },
  cardTitle: { fontSize: 12, fontFamily: monoFont, fontWeight: '700', marginBottom: 8 },
  selectInput: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderRadius: borderRadius.sm, borderWidth: 1, gap: 10 },
  selectInputText: { flex: 1, fontSize: 13, fontFamily: monoFont },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, paddingVertical: 14, borderRadius: borderRadius.md, gap: 8 },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 14, fontFamily: monoFont, fontWeight: '800', color: '#0B0F14' },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: borderRadius.md, borderWidth: 1, gap: 8, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 13, fontFamily: monoFont },
  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 12, fontFamily: monoFont, marginTop: 8 },
  scanRowCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: borderRadius.md, borderWidth: 1, marginBottom: 10 },
  scanRowContent: { flex: 1 },
  docNoText: { fontSize: 14, fontFamily: monoFont, fontWeight: '800' },
  deptText: { fontSize: 12, fontFamily: monoFont, marginTop: 2 },
  orgText: { fontSize: 11, fontFamily: monoFont, marginLeft: 8 },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: 12,
  },
  selectAllText: {
    flex: 1,
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  countBadge: {
    fontSize: 11,
    fontFamily: monoFont,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  startScanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: borderRadius.md, gap: 8, marginTop: 16 },
  startScanBtnText: { fontSize: 14, fontFamily: monoFont, fontWeight: '800', color: '#0B0F14' },
});
