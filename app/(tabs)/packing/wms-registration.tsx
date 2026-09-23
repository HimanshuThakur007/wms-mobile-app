import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/context/AuthContext';
import { useTheme } from '../../../src/context/ThemeContext';
import { BrandLogo } from '../../../src/components/common/BrandLogo';
import { HeaderActions } from '../../../src/components/common/HeaderActions';
import { DocumentSelectSheet } from '../../../src/components/common/DocumentSelectSheet';
import { DepartmentSelectSheet } from '../../../src/components/common/DepartmentSelectSheet';
import { DataSyncModal } from '../../../src/components/common/DataSyncModal';
import { DocumentType, Registration } from '../../../src/types';
import {
  getDocuments,
  getUserRegistrations,
  registerDocument,
} from '../../../src/services/api';
import {
  syncDocumentScanningData,
  fetchAndCacheScanningData,
} from '../../../src/services/localScanningCache';
import { borderRadius, spacing } from '../../../src/constants/theme';

const monoFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export default function WmsRegistrationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  const userId = user?.id ? Number(user.id) : 1;
  const userName = user?.name || 'Operator';

  const [tab, setTab] = useState<'register' | 'scan'>('register');

  // Documents and Registrations
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [regSuccess, setRegSuccess] = useState('');

  // Register Tab State
  const [selectedDoc, setSelectedDoc] = useState<DocumentType | null>(null);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [docSheetOpen, setDocSheetOpen] = useState(false);
  const [deptSheetOpen, setDeptSheetOpen] = useState(false);

  // Scan Tab State
  const [scanSearch, setScanSearch] = useState('');
  const [selectedScanDocNo, setSelectedScanDocNo] = useState<string | null>(null);
  const [selectedScanDepts, setSelectedScanDepts] = useState<string[]>([]);

  // Data Syncing State
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [syncDocNo, setSyncDocNo] = useState('');
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatusText, setSyncStatusText] = useState('');
  const [syncItemCount, setSyncItemCount] = useState<number | undefined>(undefined);
  const [syncComplete, setSyncComplete] = useState(false);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [docsData, regsData] = await Promise.all([
        getDocuments(),
        getUserRegistrations(userId),
      ]);
      setDocuments(docsData);
      setRegistrations(regsData);
    } catch (e) {
      console.log('LOAD DATA ERROR:', e);
    } finally {
      setLoading(false);
    }
  };

  // Available departments for selected document
  const availableDepts = useMemo(() => {
    if (!selectedDoc) return [];
    if (Array.isArray(selectedDoc.departments)) return selectedDoc.departments;
    if (typeof selectedDoc.departments === 'string' && (selectedDoc.departments as string).length > 0) {
      return (selectedDoc.departments as string).split(',').map((d: string) => d.trim()).filter(Boolean);
    }
    return ['General Packing', 'Receiving', 'Shipping', 'Quality Control'];
  }, [selectedDoc]);

  // Handle document selection
  const handleSelectDoc = (doc: DocumentType) => {
    setSelectedDoc(doc);
    setSelectedDepts([]);
  };

  // Toggle single department
  const toggleDept = (dept: string) => {
    setSelectedDepts((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  // Toggle all departments
  const toggleAllDepts = () => {
    if (selectedDepts.length === availableDepts.length) {
      setSelectedDepts([]);
    } else {
      setSelectedDepts([...availableDepts]);
    }
  };

  // Register document with selected departments
  const handleRegister = async () => {
    if (!selectedDoc || selectedDepts.length === 0) {
      Alert.alert('Required', 'Please select a document and at least one department.');
      return;
    }
    const docNo = selectedDoc.doc_no || selectedDoc.document_number || '';
    const docId = Number(selectedDoc.id || 0);
    const orgName = selectedDoc.organization_name || 'Organization';

    console.log('HANDLE REGISTER CLICKED:', {
      userId,
      userName,
      docId,
      docNo,
      orgName,
      selectedDepts,
    });

    try {
      setRegistering(true);
      const res = await registerDocument({
        documentId: docId,
        documentNumber: docNo,
        departments: selectedDepts,
        userId,
        userName,
        docNo,
        organizationName: orgName,
      });

      console.log('WMS REGISTRATION RESPONSE:', res);

      if (res?.status === true) {
        Alert.alert(
          'Registration Successful',
          res?.message || `Registered ${selectedDepts.length} department(s) for ${docNo}`
        );
        setRegSuccess(
          `Registered ${selectedDepts.length} department(s) for ${docNo}`
        );
        setSelectedDoc(null);
        setSelectedDepts([]);
        // Background cache picklist right away
        fetchAndCacheScanningData(docNo);
        await loadData();
        setTimeout(() => setRegSuccess(''), 4000);
      } else {
        console.log('REGISTRATION FAILED MSG:', res?.message);
        Alert.alert('Registration Failed', res?.message || 'Unable to register document.');
      }
    } catch (err: any) {
      console.log('REGISTRATION EXCEPTION:', err);
      Alert.alert('Error', err?.message || 'Network error while registering.');
    } finally {
      setRegistering(false);
    }
  };

  // Scan Tab: Group registered sessions by document
  const registeredDocs = useMemo(() => {
    const map = new Map<
      string,
      { doc_no: string; organization_name: string; departments: string[] }
    >();

    registrations.forEach((r) => {
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
      const dept = r.department || 'Packing';
      if (!entry.departments.includes(dept)) {
        entry.departments.push(dept);
      }
    });

    return Array.from(map.values());
  }, [registrations]);

  // Flatten registered docs into scan rows
  const scanRows = useMemo(() => {
    const q = scanSearch.toLowerCase().trim();
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
  }, [registeredDocs, scanSearch]);

  const selectedScanDoc = registeredDocs.find((d) => d.doc_no === selectedScanDocNo) || null;

  const handleScanRowPress = (row: { doc_no: string; department: string }) => {
    if (selectedScanDocNo === null || selectedScanDocNo !== row.doc_no) {
      setSelectedScanDocNo(row.doc_no);
      setSelectedScanDepts([row.department]);
      return;
    }
    // Same document — toggle department
    setSelectedScanDepts((prev) =>
      prev.includes(row.department)
        ? prev.filter((d) => d !== row.department)
        : [...prev, row.department]
    );
  };

  const toggleAllScanDepts = () => {
    if (!selectedScanDoc) return;
    if (selectedScanDepts.length === selectedScanDoc.departments.length) {
      setSelectedScanDepts([]);
    } else {
      setSelectedScanDepts([...selectedScanDoc.departments]);
    }
  };

  const handleStartScan = async () => {
    if (!selectedScanDoc || selectedScanDepts.length === 0) return;
    const docNo = selectedScanDoc.doc_no;
    const orgName = selectedScanDoc.organization_name;
    const depts = selectedScanDepts.join(',');

    setSyncDocNo(docNo);
    setSyncProgress(10);
    setSyncStatusText('Connecting to WMS server...');
    setSyncItemCount(undefined);
    setSyncComplete(false);
    setSyncModalVisible(true);

    try {
      const result = await syncDocumentScanningData(docNo, (progress, statusText, count) => {
        setSyncProgress(progress);
        setSyncStatusText(statusText);
        if (count !== undefined && count > 0) {
          setSyncItemCount(count);
        }
      });

      setSyncComplete(true);
      setTimeout(() => {
        setSyncModalVisible(false);
        router.push({
          pathname: '/(tabs)/packing/wms-scanning',
          params: {
            document_number: docNo,
            organization_name: orgName,
            departments: depts,
            user_id: String(userId),
          },
        });
      }, 500);
    } catch (err: any) {
      console.error('Data sync error:', err);
      setSyncProgress(100);
      setSyncStatusText('Ready to scan');
      setTimeout(() => {
        setSyncModalVisible(false);
        router.push({
          pathname: '/(tabs)/packing/wms-scanning',
          params: {
            document_number: docNo,
            organization_name: orgName,
            departments: depts,
            user_id: String(userId),
          },
        });
      }, 500);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) }]}>
      {/* ── Top Header ──────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
            <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Back</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <BrandLogo size={28} rounded />
            <HeaderActions />
          </View>
        </View>

        <View style={styles.badgeRow}>
          <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
            WMS PACKING MODULE
          </Text>
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>WMS Packing</Text>
      </View>

      {/* ── Register / Scan Tabs ────────────────────────── */}
      <View style={styles.tabBar}>
        <View style={[styles.tabTrack, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              tab === 'register' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setTab('register')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="create-outline"
              size={16}
              color={tab === 'register' ? '#0B0F14' : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabBtnText,
                { color: tab === 'register' ? '#0B0F14' : colors.textSecondary },
              ]}
            >
              Register
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              tab === 'scan' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setTab('scan')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="barcode-outline"
              size={16}
              color={tab === 'scan' ? '#0B0F14' : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabBtnText,
                { color: tab === 'scan' ? '#0B0F14' : colors.textSecondary },
              ]}
            >
              Scan
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ════════════════════════════════════════════════════
          REGISTER TAB
      ════════════════════════════════════════════════════ */}
      {tab === 'register' ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Banner */}
          <View
            style={[
              styles.bannerBox,
              {
                backgroundColor: colors.primaryMuted,
                borderColor: `${colors.primary}30`,
              },
            ]}
          >
            <View style={[styles.bannerIconWrap, { backgroundColor: colors.surface }]}>
              <Ionicons name="document-text" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>Packer Registration</Text>
              <Text style={[styles.bannerSub, { color: colors.textSecondary }]}>
                Select one document and register one or more departments.
              </Text>
            </View>
          </View>

          {/* Success Banner */}
          {regSuccess ? (
            <View
              style={[
                styles.successBox,
                {
                  backgroundColor: colors.primaryMuted,
                  borderColor: `${colors.primary}50`,
                },
              ]}
            >
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={[styles.successText, { color: colors.primary }]}>{regSuccess}</Text>
            </View>
          ) : null}

          {/* Form Card */}
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Document Select Field */}
            <View style={styles.formGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                DOCUMENT NUMBER <Text style={{ color: colors.red }}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.selectBtn,
                  {
                    backgroundColor: colors.surface3,
                    borderColor: selectedDoc ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => setDocSheetOpen(true)}
              >
                <View style={styles.selectBtnLeft}>
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color={selectedDoc ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.selectBtnText,
                      { color: selectedDoc ? colors.textPrimary : colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedDoc
                      ? selectedDoc.doc_no || selectedDoc.document_number
                      : 'Select document number'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Organization Preview */}
              {selectedDoc && (
                <View
                  style={[
                    styles.orgPreviewBox,
                    {
                      backgroundColor: colors.surface2,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons name="business-outline" size={16} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.orgLabel, { color: colors.textMuted }]}>ORGANIZATION</Text>
                    <Text style={[styles.orgText, { color: colors.textPrimary }]}>
                      {selectedDoc.organization_name || 'General Logistics'}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Department Select Field */}
            <View style={styles.formGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                DEPARTMENTS (MULTI) <Text style={{ color: colors.red }}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.selectBtn,
                  {
                    backgroundColor: colors.surface3,
                    borderColor: selectedDepts.length > 0 ? colors.primary : colors.border,
                    opacity: !selectedDoc ? 0.5 : 1,
                  },
                ]}
                disabled={!selectedDoc}
                activeOpacity={0.7}
                onPress={() => setDeptSheetOpen(true)}
              >
                <View style={styles.selectBtnLeft}>
                  <Ionicons
                    name="grid-outline"
                    size={18}
                    color={selectedDepts.length > 0 ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.selectBtnText,
                      { color: selectedDepts.length > 0 ? colors.textPrimary : colors.textMuted },
                    ]}
                  >
                    {selectedDepts.length > 0
                      ? `${selectedDepts.length} department${selectedDepts.length > 1 ? 's' : ''} selected`
                      : 'Select departments'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Selected Department Chips */}
              {selectedDepts.length > 0 && (
                <View style={styles.chipRow}>
                  {selectedDepts.map((d) => (
                    <View
                      key={d}
                      style={[
                        styles.deptChip,
                        {
                          backgroundColor: colors.primaryMuted,
                          borderColor: `${colors.primary}40`,
                        },
                      ]}
                    >
                      <Text style={[styles.deptChipText, { color: colors.primary }]}>{d}</Text>
                      <TouchableOpacity onPress={() => toggleDept(d)}>
                        <Ionicons name="close" size={14} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[
                styles.registerBtn,
                { backgroundColor: colors.primary },
                (!selectedDoc || selectedDepts.length === 0 || registering) && {
                  backgroundColor: colors.surface3,
                },
              ]}
              disabled={!selectedDoc || selectedDepts.length === 0 || registering}
              activeOpacity={0.85}
              onPress={handleRegister}
            >
              {registering ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color={!selectedDoc || selectedDepts.length === 0 ? colors.textMuted : '#0B0F14'}
                  />
                  <Text
                    style={[
                      styles.registerBtnText,
                      {
                        color:
                          !selectedDoc || selectedDepts.length === 0
                            ? colors.textMuted
                            : '#0B0F14',
                      },
                    ]}
                  >
                    Register Packer
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Registered Documents List Card */}
          <View
            style={[
              styles.tableCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.tableCardHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.tableCardTitle, { color: colors.textPrimary }]}>
                  Registered Documents
                </Text>
                <Text style={[styles.tableCardSub, { color: colors.textMuted }]}>
                  Documents registered to your ID ({registeredDocs.length})
                </Text>
              </View>
              <TouchableOpacity onPress={loadData} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="refresh" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : registeredDocs.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="folder-open-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                  No registered documents
                </Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  Select and register a document above to begin
                </Text>
              </View>
            ) : (
              registeredDocs.map((doc, idx) => (
                <View
                  key={`${doc.doc_no}-${idx}`}
                  style={[
                    styles.regItemRow,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor: idx % 2 === 1 ? colors.surface2 : 'transparent',
                    },
                  ]}
                >
                  <View style={[styles.regIconWrap, { backgroundColor: colors.primaryMuted }]}>
                    <Ionicons name="document-text" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.regDocNo, { color: colors.textPrimary }]}>
                      {doc.doc_no}
                    </Text>
                    <Text style={[styles.regDepts, { color: colors.textMuted }]} numberOfLines={1}>
                      {doc.departments.join(', ')}
                    </Text>
                  </View>
                  <View style={[styles.regBadge, { backgroundColor: colors.primaryMuted }]}>
                    <Text style={[styles.regBadgeText, { color: colors.primary }]}>REGISTERED</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      ) : (
        /* ════════════════════════════════════════════════════
            SCAN TAB
        ════════════════════════════════════════════════════ */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Scan Intro Card */}
          <View
            style={[
              styles.bannerBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.bannerIconWrap, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="barcode" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>Click to Scan</Text>
              <Text style={[styles.bannerSub, { color: colors.textMuted }]}>
                Select a registered document and departments below, then start scanning.
              </Text>
            </View>
          </View>

          {/* Search Box */}
          <View
            style={[
              styles.searchWrap,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search registered documents..."
              placeholderTextColor={colors.textMuted}
              value={scanSearch}
              onChangeText={setScanSearch}
              autoCapitalize="characters"
            />
            {scanSearch ? (
              <TouchableOpacity onPress={() => setScanSearch('')}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Document Table */}
          <View
            style={[
              styles.tableCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Table Header with Select All */}
            <View
              style={[
                styles.scanTableHeader,
                {
                  backgroundColor: colors.surface2,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.scanCheckbox,
                  {
                    backgroundColor:
                      selectedScanDoc &&
                      selectedScanDepts.length === selectedScanDoc.departments.length
                        ? colors.primary
                        : 'transparent',
                    borderColor:
                      selectedScanDoc &&
                      selectedScanDepts.length === selectedScanDoc.departments.length
                        ? colors.primary
                        : colors.border,
                  },
                ]}
                onPress={toggleAllScanDepts}
              >
                {selectedScanDoc &&
                  selectedScanDepts.length === selectedScanDoc.departments.length && (
                    <Ionicons name="checkmark" size={12} color="#0B0F14" />
                  )}
              </TouchableOpacity>
              <Text style={[styles.scanThCell, { color: colors.textMuted, flex: 1 }]}>
                DOC NO
              </Text>
              <Text style={[styles.scanThCell, { color: colors.textMuted }]}>DEPARTMENT</Text>
            </View>

            {scanRows.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="document-text-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                  No registered documents
                </Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  Register a document first in the Register tab
                </Text>
              </View>
            ) : (
              scanRows.map((row, idx) => {
                const docSelected = selectedScanDocNo === row.doc_no;
                const deptSelected = docSelected && selectedScanDepts.includes(row.department);

                return (
                  <TouchableOpacity
                    key={row.id}
                    style={[
                      styles.scanTableRow,
                      {
                        borderBottomColor: colors.border,
                        backgroundColor: docSelected ? colors.primaryMuted : 'transparent',
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleScanRowPress(row)}
                  >
                    <View
                      style={[
                        styles.scanCheckbox,
                        {
                          backgroundColor: deptSelected ? colors.primary : 'transparent',
                          borderColor: deptSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      {deptSelected && <Ionicons name="checkmark" size={12} color="#0B0F14" />}
                    </View>

                    <Text
                      style={[
                        styles.scanDocText,
                        { color: colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {row.doc_no}
                    </Text>

                    <View
                      style={[
                        styles.scanDeptTag,
                        {
                          backgroundColor: deptSelected ? colors.primary : colors.surface3,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.scanDeptTagText,
                          {
                            color: deptSelected ? '#0B0F14' : colors.textSecondary,
                          },
                        ]}
                      >
                        {row.department}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Selected Document Summary Card */}
          {selectedScanDoc && (
            <View
              style={[
                styles.selectedDocCard,
                {
                  backgroundColor: colors.primaryMuted,
                  borderColor: `${colors.primary}40`,
                },
              ]}
            >
              <Ionicons name="document-text" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectedDocLabel, { color: colors.primary }]}>
                  SELECTED DOCUMENT
                </Text>
                <Text style={[styles.selectedDocNo, { color: colors.textPrimary }]}>
                  {selectedScanDoc.doc_no}
                </Text>
                <Text style={[styles.selectedOrgName, { color: colors.textMuted }]}>
                  {selectedScanDoc.organization_name} · {selectedScanDepts.length} dept(s)
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSelectedScanDocNo(null);
                  setSelectedScanDepts([]);
                }}
              >
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Start Scan Button */}
          <TouchableOpacity
            style={[
              styles.startScanBtn,
              { backgroundColor: colors.primary },
              (!selectedScanDocNo || selectedScanDepts.length === 0) && {
                backgroundColor: colors.surface3,
              },
            ]}
            disabled={!selectedScanDocNo || selectedScanDepts.length === 0}
            activeOpacity={0.85}
            onPress={handleStartScan}
          >
            <Ionicons
              name="barcode"
              size={18}
              color={!selectedScanDocNo || selectedScanDepts.length === 0 ? colors.textMuted : '#0B0F14'}
            />
            <Text
              style={[
                styles.startScanBtnText,
                {
                  color:
                    !selectedScanDocNo || selectedScanDepts.length === 0
                      ? colors.textMuted
                      : '#0B0F14',
                },
              ]}
            >
              Click to Start Scanning
            </Text>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={!selectedScanDocNo || selectedScanDepts.length === 0 ? colors.textMuted : '#0B0F14'}
            />
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ══ Document Select Sheet (Safe Keyboard Avoidance) ══ */}
      <DocumentSelectSheet
        visible={docSheetOpen}
        onClose={() => setDocSheetOpen(false)}
        documents={documents}
        onSelectDocument={handleSelectDoc}
        title="Select Document"
        accentColor={colors.primary}
        accentMutedColor={colors.primaryMuted}
      />

      {/* ══ Department Multi-Select Sheet ══ */}
      <DepartmentSelectSheet
        visible={deptSheetOpen}
        onClose={() => setDeptSheetOpen(false)}
        departments={availableDepts}
        selectedDepartments={selectedDepts}
        onToggleDepartment={toggleDept}
        onToggleAll={toggleAllDepts}
        docNumber={selectedDoc?.doc_no || selectedDoc?.document_number}
        accentColor={colors.primary}
        accentMutedColor={colors.primaryMuted}
      />

      {/* ══ Data Sync Modal with Progressive Bar ══ */}
      <DataSyncModal
        visible={syncModalVisible}
        documentNumber={syncDocNo}
        progress={syncProgress}
        statusText={syncStatusText}
        itemCount={syncItemCount}
        isComplete={syncComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  tabBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: 10,
  },
  tabTrack: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  tabBtnText: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: 40,
  },
  bannerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: 12,
    marginBottom: spacing.md,
  },
  bannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bannerSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 8,
    marginBottom: spacing.md,
  },
  successText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '600',
    flex: 1,
  },
  formCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 48,
    borderRadius: borderRadius.lg,
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
  },
  orgPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 10,
    marginTop: 8,
  },
  orgLabel: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  orgText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  deptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 6,
  },
  deptChipText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    gap: 8,
    marginTop: spacing.xs,
  },
  registerBtnText: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  tableCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  tableCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tableCardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  tableCardSub: {
    fontSize: 10,
    fontFamily: monoFont,
    marginTop: 1,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  emptySub: {
    fontSize: 11,
    fontFamily: monoFont,
  },
  regItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  regIconWrap: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regDocNo: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  regDepts: {
    fontSize: 10,
    marginTop: 1,
  },
  regBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  regBadgeText: {
    fontSize: 8,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    height: 44,
    gap: 8,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: monoFont,
  },
  scanTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  scanCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanThCell: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  scanTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  scanDocText: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '700',
    flex: 1,
  },
  scanDeptTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  scanDeptTagText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  selectedDocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: 10,
    marginBottom: spacing.md,
  },
  selectedDocLabel: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  selectedDocNo: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '800',
    marginTop: 1,
  },
  selectedOrgName: {
    fontSize: 11,
    marginTop: 1,
  },
  startScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    gap: 8,
    marginBottom: spacing.lg,
  },
  startScanBtnText: {
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '800',
  },
});
