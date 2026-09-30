import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/context/AuthContext';
import { useTheme } from '../../../src/context/ThemeContext';
import { useLanguage } from '../../../src/context/LanguageContext';
import { AppHeader } from '../../../src/components/common/AppHeader';
import {
  findPutawayItemLocalOrRemote,
  loadPutawayDataFromStorage,
  saveInProgressScannedItems,
  loadInProgressScannedItems,
  clearInProgressScannedItems,
  submitGrn,
  PutawayGrnItem,
} from '../../../src/services/api';
import { CancelItemModal } from '../../../src/components/scanning/modals/CancelItemModal';
import { EditQtyModal } from '../../../src/components/scanning/modals/EditQtyModal';
import { DuplicateItemModal } from '../../../src/components/scanning/modals/DuplicateItemModal';
import { HardwareScanInputCard } from '../../../src/components/scanning/HardwareScanInputCard';
import { borderRadius, spacing, monoFont } from '../../../src/constants/theme';

interface PutawayScannedItem {
  id: number;
  itemcode: string;
  itemname: string;
  grn_number: string;
  bin_location: string;
  requested_quantity: number;
  packedqty: number;
  department: string;
  itemstatus: 'scanned' | 'revised' | 'cancelled';
  scanned_at: string;
}

export default function PutawayScanningScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { t, isHindi } = useLanguage();

  const grnNumberParam = String(params.grn_number || params.grn_numbers || 'GRN-1778').trim();
  const vouchDateParam = String(params.vouch_date || '');
  const billNoParam = String(params.bill_no || '');
  const grnDepartmentParam = String(params.grn_department || '');
  const grnDepartmentsParam = String(params.grn_departments || params.grn_department || '');
  const binLocationParam = String(params.bin_location || 'G1');
  const binDepartmentParam = String(params.bin_department || '');

  const departments: string[] = useMemo(() => {
    const raw = grnDepartmentsParam || grnDepartmentParam || binDepartmentParam || '';
    if (!raw) return [];
    return Array.from(
      new Set(
        raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );
  }, [grnDepartmentsParam, grnDepartmentParam, binDepartmentParam]);

  const [activeGrn, setActiveGrn] = useState(grnNumberParam);
  const [binLocation, setBinLocation] = useState(binLocationParam);
  const [binDepartment, setBinDepartment] = useState(binDepartmentParam);
  const [showAllDepts, setShowAllDepts] = useState(false);
  const [itemCode, setItemCode] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [allScannedItems, setAllScannedItems] = useState<PutawayScannedItem[]>([]);
  const [cachedGrnItems, setCachedGrnItems] = useState<PutawayGrnItem[]>([]);

  const inputRef = useRef<TextInput>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCodeRef = useRef<string>('');
  const lastTimeRef = useRef<number>(0);
  const barcodeBufferRef = useRef<string>('');
  const refocusTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const processingRef = useRef<boolean>(false);
  const isRestoringSessionRef = useRef<boolean>(false);

  // Modals
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelItemId, setCancelItemId] = useState<number | null>(null);
  const [cancelRemarks, setCancelRemarks] = useState('');

  const [editQtyVisible, setEditQtyVisible] = useState(false);
  const [editQtyItem, setEditQtyItem] = useState<PutawayScannedItem | null>(null);
  const [editQtyValue, setEditQtyValue] = useState('');

  const [duplicateVisible, setDuplicateVisible] = useState(false);
  const [duplicateItem, setDuplicateItem] = useState<{
    itemcode: string;
    itemname: string;
    grn_number: string;
    bin_location: string;
    requested_quantity: number;
    already_packed: number;
    balance_qty: number;
  } | null>(null);
  const [duplicateQty, setDuplicateQty] = useState('1');

  // Pre-load local storage data & restore saved in-progress scanned items for this GRN
  useEffect(() => {
    if (!activeGrn) return;
    const restoreSavedSession = async () => {
      try {
        isRestoringSessionRef.current = true;
        const loadedGrnData = await loadPutawayDataFromStorage(activeGrn);
        if (loadedGrnData && Array.isArray(loadedGrnData)) {
          setCachedGrnItems(loadedGrnData);
        }
        const savedSession = await loadInProgressScannedItems(activeGrn);
        if (savedSession && Array.isArray(savedSession.items) && savedSession.items.length > 0) {
          setAllScannedItems(savedSession.items);
          console.log(`[PutawayScanning] Restored ${savedSession.items.length} in-progress scanned items for GRN '${activeGrn}'`);
        }
      } catch (err) {
        console.error('[PutawayScanning] Restore session error:', err);
      } finally {
        setTimeout(() => {
          isRestoringSessionRef.current = false;
        }, 300);
      }
    };

    restoreSavedSession();
  }, [activeGrn]);

  // Auto-save in-progress scanned items to local storage whenever cart changes
  useEffect(() => {
    if (isRestoringSessionRef.current) return;
    if (activeGrn) {
      saveInProgressScannedItems(activeGrn, allScannedItems);
    }
  }, [allScannedItems, activeGrn]);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  const prevDuplicateVisible = useRef(duplicateVisible);
  const prevEditQtyVisible = useRef(editQtyVisible);
  const prevCancelModalVisible = useRef(cancelModalVisible);

  const clearAndRefocus = () => {
    setItemCode('');
    barcodeBufferRef.current = '';

    // Cancel any previously queued refocus timers
    refocusTimersRef.current.forEach((t) => clearTimeout(t));
    refocusTimersRef.current = [];

    // Only refocus if no modal is open
    const anyModalOpen = duplicateVisible || editQtyVisible || cancelModalVisible;
    if (!anyModalOpen) {
      const t1 = setTimeout(() => { inputRef.current?.focus(); }, 80);
      const t2 = setTimeout(() => { inputRef.current?.focus(); }, 250);
      refocusTimersRef.current = [t1, t2];
    }
  };

  useEffect(() => {
    const wasOpen =
      prevDuplicateVisible.current ||
      prevEditQtyVisible.current ||
      prevCancelModalVisible.current;

    const isNowClosed =
      !duplicateVisible &&
      !editQtyVisible &&
      !cancelModalVisible;

    if (wasOpen && isNowClosed) {
      clearAndRefocus();
    }

    prevDuplicateVisible.current = duplicateVisible;
    prevEditQtyVisible.current = editQtyVisible;
    prevCancelModalVisible.current = cancelModalVisible;
  }, [duplicateVisible, editQtyVisible, cancelModalVisible]);

  const handleProcessBarcode = async (scannedCode: string) => {
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    const trimmed = scannedCode.replace(/[\r\n\t]+/g, '').trim();
    if (!trimmed || trimmed.length < 2) {
      clearAndRefocus();
      return;
    }

    // Prevent concurrent processing — if already handling a scan, skip
    if (processingRef.current) {
      setItemCode('');
      barcodeBufferRef.current = '';
      return;
    }

    const now = Date.now();
    if (
      trimmed.toLowerCase() === lastCodeRef.current.toLowerCase() &&
      now - lastTimeRef.current < 400
    ) {
      setItemCode('');
      barcodeBufferRef.current = '';
      return;
    }

    lastCodeRef.current = trimmed;
    lastTimeRef.current = now;

    try {
      processingRef.current = true;
      setScanning(true);

      // 1. Fast 0ms local storage lookup
      const localLookup = await findPutawayItemLocalOrRemote(activeGrn, trimmed);
      const localData = localLookup?.data;

      // Validate if the item belongs to this GRN
      if (!localLookup || localLookup.status !== true || !localData || !localData.itemcode) {
        Alert.alert(
          t('Item Not Found in GRN'),
          isHindi
            ? `आइटम "${trimmed}" GRN ${activeGrn} के लिए आवंटित आइटमों में नहीं मिला। कृपया एक मान्य आइटम स्कैन करें।`
            : `Item "${trimmed}" is not found in the assigned items for GRN ${activeGrn}. Please scan a valid item.`
        );
        clearAndRefocus();
        return;
      }

      const itemName = localData?.itemDesc || localData?.itemname || localData?.item_name || `SKU-${trimmed}`;
      const reqQty = Number(localData?.orderedQty ?? localData?.requested_quantity ?? 1);
      const itemDept = localData?.department || grnDepartmentParam || binDepartment || 'Putaway Binning';

      // Validate department against assigned GRN departments
      const isDeptMatched =
        departments.length === 0 ||
        !localData.department ||
        departments.some(
          (d) => d.trim().toUpperCase() === localData.department.trim().toUpperCase()
        );

      if (!isDeptMatched) {
        Alert.alert(
          t('Department Warning'),
          isHindi
            ? `आइटम "${trimmed}" विभाग "${localData.department}" का है, जबकि GRN "${departments.join(', ')}" को आवंटित है। क्या आप आगे बढ़ना चाहते हैं?`
            : `Item "${trimmed}" belongs to "${localData.department}", while GRN is assigned to "${departments.join(', ')}". Do you want to proceed?`,
          [
            { text: t('Cancel'), style: 'cancel', onPress: () => clearAndRefocus() },
            {
              text: t('Confirm'),
              onPress: () => processValidScan(trimmed, itemName, reqQty, itemDept),
            },
          ]
        );
        return;
      }

      processValidScan(trimmed, itemName, reqQty, itemDept, localData);
    } catch (err: any) {
      Alert.alert(t('Scan Error'), err?.message || t('Unable to process barcode.'));
      clearAndRefocus();
    } finally {
      processingRef.current = false;
      barcodeBufferRef.current = '';
      setScanning(false);
    }
  };

  const processValidScan = (
    code: string,
    itemName: string,
    reqQty: number,
    itemDept: string,
    localItemData?: any
  ) => {
    const targetItemCode = String(
      localItemData?.itemcode ||
        localItemData?.itemCode ||
        localItemData?.item ||
        code
    ).trim();

    // Create match keys covering all representations (itemCode, barcode, raw scan, etc.)
    const matchKeys = new Set(
      [
        code.trim().toLowerCase(),
        targetItemCode.toLowerCase(),
        String(localItemData?.itemcode || '').trim().toLowerCase(),
        String(localItemData?.itemCode || '').trim().toLowerCase(),
        String(localItemData?.item || '').trim().toLowerCase(),
        String(localItemData?.barcode || '').trim().toLowerCase(),
        String(localItemData?.barcode1 || '').trim().toLowerCase(),
        String(localItemData?.barcode2 || '').trim().toLowerCase(),
        String(localItemData?.sku || '').trim().toLowerCase(),
      ].filter(Boolean)
    );

    const existingRows = allScannedItems.filter(
      (it) =>
        matchKeys.has(String(it.itemcode || '').trim().toLowerCase()) &&
        it.itemstatus !== 'cancelled'
    );

    if (existingRows.length > 0) {
      // Duplicate item detected
      const alreadyPacked = existingRows.reduce((sum, it) => sum + Number(it.packedqty || 0), 0);
      const resolvedReqQty = existingRows[0].requested_quantity || reqQty;
      const balanceQty = Math.max(0, resolvedReqQty - alreadyPacked);

      if (alreadyPacked >= resolvedReqQty) {
        Alert.alert(
          t('Limit Reached'),
          isHindi
            ? `आइटम "${targetItemCode}" के लिए ऑर्डर मात्रा ${resolvedReqQty} की सीमा पूरी हो चुकी है। और इकाइयां नहीं जोड़ी जा सकतीं।`
            : `Cannot allocate more than ordered quantity (${resolvedReqQty}) for SKU ${targetItemCode}. Already allocated: ${alreadyPacked}.`
        );
        clearAndRefocus();
        return;
      }

      setDuplicateItem({
        itemcode: targetItemCode,
        itemname: itemName,
        grn_number: activeGrn,
        bin_location: binLocation,
        requested_quantity: resolvedReqQty,
        already_packed: alreadyPacked,
        balance_qty: balanceQty,
      });
      setDuplicateQty(balanceQty > 0 ? String(Math.floor(balanceQty)) : '1');
      setDuplicateVisible(true);
      clearAndRefocus();
      return;
    }

    // Add new scanned putaway item populated from local cache (capped at reqQty)
    const initialPackedQty = Math.min(reqQty, reqQty);

    const newItem: PutawayScannedItem = {
      id: Date.now(),
      itemcode: targetItemCode,
      itemname: itemName,
      grn_number: activeGrn,
      bin_location: binLocation,
      requested_quantity: reqQty,
      packedqty: initialPackedQty,
      department: itemDept,
      itemstatus: 'scanned',
      scanned_at: new Date().toISOString(),
    };

    setAllScannedItems((prev) => [newItem, ...prev]);
    clearAndRefocus();
  };

  const handleTextChange = (text: string) => {
    setItemCode(text);
    barcodeBufferRef.current = text;

    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    if (/[\r\n\t]/.test(text)) {
      handleProcessBarcode(text);
      return;
    }

    if (text.trim().length >= 2) {
      scanTimerRef.current = setTimeout(() => {
        handleProcessBarcode(barcodeBufferRef.current);
      }, 120);
    }
  };

  const closeDuplicateModal = () => {
    setDuplicateVisible(false);
    setDuplicateItem(null);
    setDuplicateQty('1');
    lastCodeRef.current = '';
    lastTimeRef.current = 0;
    clearAndRefocus();
  };

  const handleDuplicateInsert = () => {
    if (!duplicateItem) return;
    const qty = parseInt(duplicateQty, 10);
    if (isNaN(qty) || qty < 1) {
      Alert.alert(t('Invalid Quantity'), t('Please enter a valid quantity.'));
      return;
    }

    const maxAllowedRemaining = Math.max(0, duplicateItem.requested_quantity - duplicateItem.already_packed);
    if (qty > maxAllowedRemaining) {
      Alert.alert(
        t('Quantity Exceeds Limit'),
        isHindi
          ? `मात्रा ऑर्डर मात्रा (${duplicateItem.requested_quantity}) से अधिक नहीं हो सकती। अधिकतम शेष स्वीकार्य ${maxAllowedRemaining} इकाइयां हैं।`
          : `Quantity cannot exceed ordered quantity (${duplicateItem.requested_quantity}). Maximum remaining allowed is ${maxAllowedRemaining} units.`
      );
      return;
    }

    const newItem: PutawayScannedItem = {
      id: Date.now(),
      itemcode: duplicateItem.itemcode,
      itemname: duplicateItem.itemname || `SKU-${duplicateItem.itemcode}`,
      grn_number: duplicateItem.grn_number,
      bin_location: duplicateItem.bin_location,
      requested_quantity: duplicateItem.requested_quantity,
      packedqty: qty,
      department: grnDepartmentParam || binDepartment || 'Putaway Binning',
      itemstatus: 'revised',
      scanned_at: new Date().toISOString(),
    };

    setAllScannedItems((prev) => [newItem, ...prev]);
    closeDuplicateModal();
  };

  const handleCancelItem = () => {
    if (!cancelItemId) return;
    setAllScannedItems((prev) =>
      prev.map((it) => (it.id === cancelItemId ? { ...it, itemstatus: 'cancelled' } : it))
    );
    setCancelModalVisible(false);
    setCancelItemId(null);
    setCancelRemarks('');
    clearAndRefocus();
  };

  const handleUpdateQty = () => {
    if (!editQtyItem) return;
    const qty = parseInt(editQtyValue, 10);
    if (isNaN(qty) || qty < 0) {
      Alert.alert(t('Invalid Quantity'), t('Please enter a valid number.'));
      return;
    }

    const targetCode = editQtyItem.itemcode.trim().toLowerCase();
    const otherRowsPacked = allScannedItems
      .filter((it) => it.id !== editQtyItem.id && it.itemstatus !== 'cancelled' && it.itemcode.trim().toLowerCase() === targetCode)
      .reduce((sum, it) => sum + Number(it.packedqty || 0), 0);

    const maxAllowedForLine = Math.max(0, editQtyItem.requested_quantity - otherRowsPacked);
    if (qty > maxAllowedForLine) {
      Alert.alert(
        t('Quantity Exceeds Limit'),
        isHindi
          ? `मात्रा ऑर्डर मात्रा (${editQtyItem.requested_quantity}) से अधिक नहीं हो सकती। इस लाइन के लिए अधिकतम स्वीकार्य ${maxAllowedForLine} इकाइयां हैं।`
          : `Quantity cannot exceed ordered quantity (${editQtyItem.requested_quantity}). Maximum allowed for this line is ${maxAllowedForLine} units.`
      );
      return;
    }

    setAllScannedItems((prev) =>
      prev.map((it) =>
        it.id === editQtyItem.id ? { ...it, packedqty: qty, itemstatus: 'revised' } : it
      )
    );
    setEditQtyVisible(false);
    setEditQtyItem(null);
    setEditQtyValue('');
    clearAndRefocus();
  };

  // Aggregated SKU Stats
  const skuStatsMap = useMemo(() => {
    const map = new Map<string, { totalPacked: number; rowCount: number }>();
    allScannedItems.forEach((it) => {
      if (it.itemstatus === 'cancelled') return;
      const key = it.itemcode.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.totalPacked += it.packedqty;
        existing.rowCount += 1;
      } else {
        map.set(key, { totalPacked: it.packedqty, rowCount: 1 });
      }
    });
    return map;
  }, [allScannedItems]);

  const activeItems = allScannedItems.filter((it) => it.itemstatus !== 'cancelled');
  const totalUnits = activeItems.reduce((sum, it) => sum + it.packedqty, 0);

  const pendingSummary = useMemo(() => {
    if (cachedGrnItems.length === 0) {
      return {
        pendingLines: 0,
        pendingUnits: 0,
        totalAssignedLines: 0,
        totalAssignedUnits: 0,
      };
    }

    const scannedQtyMap = new Map<string, number>();
    activeItems.forEach((it) => {
      const code = String(it.itemcode || '').trim().toLowerCase();
      scannedQtyMap.set(code, (scannedQtyMap.get(code) || 0) + it.packedqty);
    });

    let pendingLines = 0;
    let totalAssignedUnits = 0;

    cachedGrnItems.forEach((item) => {
      const code = String(item.itemcode || item.itemCode || item.item || '').trim().toLowerCase();
      const reqQty = Number(item.orderedQty ?? item.requested_quantity ?? item.qty ?? 1) || 1;
      totalAssignedUnits += reqQty;
      const binnedQty = scannedQtyMap.get(code) || 0;
      if (binnedQty < reqQty) {
        pendingLines += 1;
      }
    });

    const pendingUnits = Math.max(0, totalAssignedUnits - totalUnits);

    return {
      pendingLines,
      pendingUnits,
      totalAssignedLines: cachedGrnItems.length,
      totalAssignedUnits,
    };
  }, [cachedGrnItems, activeItems, totalUnits]);

  const handleSubmitPutaway = () => {
    if (activeItems.length === 0) {
      Alert.alert(t('No Items'), t('Please scan at least one item into the target bin.'));
      return;
    }

    Alert.alert(
      t('Submit Putaway'),
      isHindi
        ? `GRN ${activeGrn} के लिए बिन ${binLocation} में ${totalUnits} इकाइयों (${activeItems.length} लाइनों) का पुटअवे आवंटन पूर्ण करें?`
        : `Complete putaway allocation of ${totalUnits} units (${activeItems.length} lines) into Bin ${binLocation} for GRN ${activeGrn}?`,
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Confirm & Submit'),
          onPress: async () => {
            try {
              setSubmitting(true);
              const deptsToSubmit =
                departments.length > 0
                  ? departments
                  : grnDepartmentParam
                  ? grnDepartmentParam.split(',').map((d) => d.trim()).filter(Boolean)
                  : [];

              const payload = {
                grn: activeGrn,
                department: deptsToSubmit,
                vouchdate: vouchDateParam,
              };

              console.log('[PutawayScanning] Submitting putaway GRN payload:', payload);

              const res = await submitGrn(payload);
              console.log('[PutawayScanning] Submit GRN API Response:', res);

              await clearInProgressScannedItems(activeGrn);

              Alert.alert(
                t('Putaway Completed'),
                res?.message ||
                  (isHindi
                    ? `${activeGrn} के लिए ${binLocation} में ${totalUnits} इकाइयां सफलतापूर्वक आवंटित की गईं`
                    : `Successfully allocated ${totalUnits} units into ${binLocation} for ${activeGrn}`),
                [
                  {
                    text: t('Done'),
                    onPress: () => router.replace('/(tabs)/putaway'),
                  },
                ]
              );
            } catch (err: any) {
              console.error('[PutawayScanning] Submit GRN API error:', err);
              Alert.alert(
                t('Submit Error'),
                err?.message || t('Failed to submit putaway GRN. Please try again.')
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === 'revised') {
      return { label: t('REVISED'), color: colors.violet, bg: colors.violetMuted, border: colors.violet };
    }
    if (status === 'cancelled') {
      return { label: t('CANCELLED'), color: colors.red, bg: colors.redMuted, border: colors.red };
    }
    return { label: t('SCANNED'), color: colors.emerald, bg: `${colors.emerald}20`, border: colors.emerald };
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* ── Top Header ─────────────────────────────────────────── */}
      <AppHeader
        showBack
        onBack={() => router.back()}
        moduleTag={t('INBOUND PUTAWAY SCANNING')}
        moduleTagColor={colors.violet}
        title={t('Putaway Scanning')}
        subtitle={`GRN ${activeGrn} · Bin ${binLocation}${departments.length > 0 ? ` · ${departments[0]}` : ''}`}
        accentColor={colors.violet}
        showLogo
        showActions
        showLogout
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Compact Heads-Up Context Bar ─────────────────────── */}
        <View style={[styles.contextCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.contextLeft}>
            {/* Bin location tag */}
            <View style={[styles.binTag, { backgroundColor: colors.violetMuted, borderColor: `${colors.violet}40` }]}>
              <Ionicons name="location" size={12} color={colors.violet} />
              <Text style={[styles.binTagText, { color: colors.violet }]}>{binLocation}</Text>
            </View>

            {/* GRN number tag */}
            <View style={[styles.grnSingleTag, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Ionicons name="document-text" size={11} color={colors.textSecondary} />
              <Text style={[styles.grnSingleTagText, { color: colors.textSecondary }]}>{activeGrn}</Text>
            </View>

            {/* Bill No tag if present */}
            {billNoParam ? (
              <View style={[styles.grnSingleTag, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                <Ionicons name="receipt-outline" size={11} color={colors.textSecondary} />
                <Text style={[styles.grnSingleTagText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {billNoParam}
                </Text>
              </View>
            ) : null}

            {/* Primary Department chip */}
            {departments.length > 0 && (
              <View
                style={[styles.deptTag, { backgroundColor: `${colors.violet}14`, borderColor: `${colors.violet}30` }]}
              >
                <Ionicons name="pricetag-outline" size={9.5} color={colors.violet} />
                <Text style={[styles.deptTagText, { color: colors.violet }]} numberOfLines={1}>
                  {departments[0]}
                </Text>
              </View>
            )}

            {/* Expanded Departments (when toggled on) */}
            {showAllDepts &&
              departments.slice(1).map((dept, dIdx) => (
                <View
                  key={`hdr-dept-extra-${dIdx}`}
                  style={[styles.deptTag, { backgroundColor: `${colors.violet}14`, borderColor: `${colors.violet}30` }]}
                >
                  <Ionicons name="pricetag-outline" size={9.5} color={colors.violet} />
                  <Text style={[styles.deptTagText, { color: colors.violet }]} numberOfLines={1}>
                    {dept}
                  </Text>
                </View>
              ))}

            {/* Show More / Show Less Toggle Button */}
            {departments.length > 1 && (
              <TouchableOpacity
                style={[
                  styles.moreDeptsBtn,
                  {
                    backgroundColor: showAllDepts ? `${colors.violet}20` : colors.surface2,
                    borderColor: showAllDepts ? `${colors.violet}60` : colors.border,
                  },
                ]}
                onPress={() => setShowAllDepts(!showAllDepts)}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text
                  style={[
                    styles.moreDeptsBtnText,
                    { color: showAllDepts ? colors.violet : colors.textSecondary },
                  ]}
                >
                  {showAllDepts ? t('Show less') : `+${departments.length - 1} ${t('more')}`}
                </Text>
                <Ionicons
                  name={showAllDepts ? 'chevron-up' : 'chevron-down'}
                  size={10}
                  color={showAllDepts ? colors.violet : colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="create-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>{t('Change')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Hardware Laser Scanner Receiver Card ─────────────── */}
        <HardwareScanInputCard
          inputRef={inputRef}
          itemCode={itemCode}
          inputFocused={inputFocused}
          scanning={scanning}
          title={t('Hardware Scanner')}
          subtitle={`Bin ${binLocation}${departments.length > 0 ? ` · ${departments[0]}` : ''} · ${inputFocused ? t('Ready for laser barcode scan') : t('Tap to focus scanner')}`}
          placeholderFocused={`● ${t('Scanner Active — Ready to scan SKU...')}`}
          placeholderBlurred={`${t('Tap to focus scanner')}...`}
          accentColor={colors.violet}
          onChangeText={handleTextChange}
          onSubmitEditing={() => {
            const code = barcodeBufferRef.current || itemCode;
            if (code.trim()) {
              handleProcessBarcode(code);
            }
          }}
          onFocus={() => setInputFocused(true)}
          onBlur={() => {
            setInputFocused(false);
            if (!duplicateVisible && !editQtyVisible && !cancelModalVisible) {
              setTimeout(() => inputRef.current?.focus(), 60);
            }
          }}
        />

        {/* ── Scanned Items Table (Cart: Max 5 Items Shown) ─────── */}
        <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.tableCardHeader, { borderBottomColor: colors.border, backgroundColor: isDark ? `${colors.violet}12` : '#F5F3FF' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <View style={[styles.tableHeaderIconBox, { backgroundColor: colors.violetMuted }]}>
                <Ionicons name="cart" size={15} color={colors.violet} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tableCardTitle, { color: colors.textPrimary }]}>{t('Putaway Manifest')}</Text>
                <Text style={[styles.tableCardSub, { color: colors.textMuted }]}>
                  {allScannedItems.length > 5
                    ? `BIN ${binLocation} · ${t('Showing latest 5 of')} ${allScannedItems.length} ${t('items')}`
                    : `BIN ${binLocation} · ${activeItems.length} ${t('SKUs')} (${totalUnits} ${t('Units')})`}
                </Text>
              </View>
            </View>
            <View style={[styles.tableCountBadge, { backgroundColor: colors.violetMuted, borderColor: `${colors.violet}40` }]}>
              <Text style={[styles.tableCountText, { color: colors.violet }]}>
                {totalUnits} {t('Units Binned')}
              </Text>
            </View>
          </View>

          {allScannedItems.length === 0 ? (
            <View style={styles.emptyTable}>
              <View style={[styles.emptyIconBox, { backgroundColor: colors.surface2 }]}>
                <Ionicons name="barcode-outline" size={28} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTableTitle, { color: colors.textSecondary }]}>
                {t('No items scanned to bin')}
              </Text>
              <Text style={[styles.emptyTableSub, { color: colors.textMuted }]}>
                {t('Trigger hardware scanner to allocate SKUs into')} {binLocation}
              </Text>
            </View>
          ) : (
            <View style={styles.tableBodyWrap}>
              <View style={[styles.tableHeaderRow, { backgroundColor: colors.surface2, borderBottomColor: colors.border }]}>
                <Text style={[styles.thCell, { color: colors.textMuted, width: 24, textAlign: 'center' }]}>#</Text>
                <Text style={[styles.thCell, { color: colors.textMuted, width: 48 }]}>{t('BIN')}</Text>
                <Text style={[styles.thCell, { color: colors.textMuted, flex: 1 }]}>{t('SKU')}</Text>
                <Text style={[styles.thCell, { color: colors.textMuted, width: 34, textAlign: 'center' }]}>{t('ORD')}</Text>
                <Text style={[styles.thCell, { color: colors.textMuted, width: 44, textAlign: 'center' }]}>{t('PUT')}</Text>
                <Text style={[styles.thCell, { color: colors.textMuted, width: 28, textAlign: 'center' }]}>{t('DIF')}</Text>
                <Text style={[styles.thCell, { color: colors.textMuted, width: 50, textAlign: 'center' }]}>{t('STAT')}</Text>
              </View>

              {allScannedItems.slice(0, 5).map((item, idx) => {
                const isCancelled = item.itemstatus === 'cancelled';
                const skuKey = item.itemcode.toLowerCase();
                const skuStats = skuStatsMap.get(skuKey);
                const totalSkuPacked = skuStats ? skuStats.totalPacked : item.packedqty;
                const diff = isCancelled ? 0 : item.requested_quantity - totalSkuPacked;
                const isRevised = !isCancelled && (item.itemstatus === 'revised' || (skuStats && skuStats.rowCount > 1));
                const currentStatus = isCancelled ? 'cancelled' : isRevised ? 'revised' : 'scanned';
                const badge = getStatusBadge(currentStatus);

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.tableRow,
                      {
                        borderBottomColor: colors.border,
                        backgroundColor: idx % 2 === 1 ? colors.surface2 : colors.surface,
                      },
                      isCancelled && styles.tableRowCancelled,
                    ]}
                  >
                    {/* Trash/Delete Action */}
                    <View style={{ width: 24, alignItems: 'center' }}>
                      <TouchableOpacity
                        disabled={isCancelled}
                        onPress={() => {
                          if (!isCancelled) {
                            setCancelItemId(item.id);
                            setCancelRemarks('');
                            setCancelModalVisible(true);
                          }
                        }}
                        style={[
                          styles.rowTrashBtn,
                          { backgroundColor: colors.redMuted },
                          isCancelled && styles.rowTrashBtnDisabled,
                        ]}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={11}
                          color={isCancelled ? colors.textMuted : colors.red}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Target Bin Tag */}
                    <View style={{ width: 48 }}>
                      <View style={[styles.boxTag, { backgroundColor: colors.violetMuted }]}>
                        <Text style={[styles.boxTagText, { color: colors.violet }]} numberOfLines={1}>
                          {item.bin_location}
                        </Text>
                      </View>
                    </View>

                    {/* Item SKU / Code */}
                    <View style={{ flex: 1, paddingRight: 4, justifyContent: 'center' }}>
                      <Text
                        style={[
                          styles.rowItemCode,
                          { color: colors.textPrimary },
                          isCancelled && [styles.rowTextCancelled, { color: colors.textMuted }],
                        ]}
                        numberOfLines={1}
                      >
                        {item.itemcode}
                      </Text>
                    </View>

                    {/* Ordered Quantity (ORD) */}
                    <View style={{ width: 34, alignItems: 'center' }}>
                      <Text
                        style={[
                          styles.rowNum,
                          { color: colors.textSecondary },
                          isCancelled && [styles.rowTextCancelled, { color: colors.textMuted }],
                        ]}
                      >
                        {item.requested_quantity}
                      </Text>
                    </View>

                    {/* Packed / Binned Quantity (PUT) */}
                    <View style={{ width: 44, alignItems: 'center' }}>
                      <TouchableOpacity
                        disabled={isCancelled}
                        onPress={() => {
                          if (!isCancelled) {
                            setEditQtyItem(item);
                            setEditQtyValue(String(item.packedqty));
                            setEditQtyVisible(true);
                          }
                        }}
                        style={[
                          styles.packedQtyPill,
                          { backgroundColor: colors.violetMuted },
                          isCancelled && styles.packedQtyPillDisabled,
                        ]}
                      >
                        <Text style={[styles.packedQtyText, { color: colors.violet }]}>
                          {item.packedqty}
                        </Text>
                        {!isCancelled && <Ionicons name="pencil" size={8} color={colors.violet} />}
                      </TouchableOpacity>
                    </View>

                    {/* Difference Quantity (DIF) */}
                    <View style={{ width: 28, alignItems: 'center' }}>
                      <Text
                        style={[
                          styles.rowDiffText,
                          {
                            color: isCancelled
                              ? colors.textMuted
                              : diff === 0
                              ? colors.emerald
                              : diff < 0
                              ? colors.red
                              : colors.amber,
                            fontWeight: diff === 0 ? '700' : '800',
                          },
                          isCancelled && [styles.rowTextCancelled, { color: colors.textMuted }],
                        ]}
                      >
                        {isCancelled ? '—' : diff}
                      </Text>
                    </View>

                    {/* Status Badge (STAT) */}
                    <View style={{ width: 50, alignItems: 'center' }}>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: badge.bg,
                            borderColor: `${badge.border}40`,
                          },
                        ]}
                      >
                        <Text style={[styles.statusBadgeText, { color: badge.color }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              {allScannedItems.length > 5 && (
                <View style={[styles.limitedCartFooter, { borderTopColor: colors.border, backgroundColor: colors.surface2 }]}>
                  <Ionicons name="layers-outline" size={13} color={colors.violet} />
                  <Text style={[styles.limitedCartFooterText, { color: colors.textMuted }]}>
                    {t('Showing latest 5 of')} {allScannedItems.length} {t('putaway items · All items are saved & counted')}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Putaway Statistics Summary ───────────────────────── */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statsHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="stats-chart" size={14} color={colors.violet} />
              <Text style={[styles.statsTitle, { color: colors.textSecondary }]}>{t('PUTAWAY SUMMARY')}</Text>
            </View>
            {pendingSummary.totalAssignedUnits > 0 && (
              <Text style={[styles.statsSubText, { color: colors.textMuted }]}>
                {totalUnits}/{pendingSummary.totalAssignedUnits} {t('Units Binned')}
              </Text>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Text style={[styles.statBoxNum, { color: colors.violet }]}>{allScannedItems.length}</Text>
              <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>{t('TOTAL LINES')}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Text style={[styles.statBoxNum, { color: colors.emerald }]}>{totalUnits}</Text>
              <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>{t('UNITS BINNED')}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.amberMuted, borderColor: `${colors.amber}50`, borderWidth: 1 }]}>
              <Text style={[styles.statBoxNum, { color: colors.amber }]}>{pendingSummary.pendingLines}</Text>
              <Text style={[styles.statBoxLabel, { color: colors.amber }]}>{t('PENDING ITEMS')}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Text style={[styles.statBoxNum, { color: colors.primary }]}>1</Text>
              <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>{t('GRN LINKED')}</Text>
            </View>
          </View>
        </View>

        {/* ── Submit Putaway Action ────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            {
              backgroundColor: colors.violet,
              opacity: activeItems.length > 0 && !submitting ? 1 : 0.6,
            },
          ]}
          disabled={activeItems.length === 0 || submitting}
          onPress={handleSubmitPutaway}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.submitBtnText} numberOfLines={1} ellipsizeMode="tail">
                {t('Submit Putaway')} ({totalUnits} {t('Units')})
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* DUPLICATE MODAL */}
      <DuplicateItemModal
        visible={duplicateVisible}
        item={duplicateItem}
        quantity={duplicateQty}
        onQuantityChange={setDuplicateQty}
        onClose={closeDuplicateModal}
        onConfirm={handleDuplicateInsert}
      />

      {/* EDIT QUANTITY MODAL */}
      <EditQtyModal
        visible={editQtyVisible}
        itemCode={editQtyItem?.itemcode}
        requestedQty={editQtyItem?.requested_quantity}
        value={editQtyValue}
        onValueChange={setEditQtyValue}
        onClose={() => setEditQtyVisible(false)}
        onConfirm={handleUpdateQty}
      />

      {/* CANCEL ITEM MODAL */}
      <CancelItemModal
        visible={cancelModalVisible}
        remarks={cancelRemarks}
        onRemarksChange={setCancelRemarks}
        onClose={() => setCancelModalVisible(false)}
        onConfirm={handleCancelItem}
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
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 6,
  },
  contextLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
    flex: 1,
  },
  binTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  binTagText: {
    fontSize: 11.5,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  deptTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  deptTagText: {
    fontSize: 9.5,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  grnSingleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  grnSingleTagText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '600',
  },
  moreDeptsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  moreDeptsBtnText: {
    fontSize: 9.5,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  multiGrnStrip: {
    marginTop: -4,
  },
  grnChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  grnLabel: {
    fontSize: 9.5,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  grnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  grnPillText: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
  },
  tableCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tableHeaderIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCardTitle: {
    fontSize: 13.5,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  tableCardSub: {
    fontSize: 10.5,
    fontFamily: monoFont,
    marginTop: 1,
  },
  tableCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  tableCountText: {
    fontSize: 10.5,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  emptyTable: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 6,
  },
  emptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTableTitle: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  emptyTableSub: {
    fontSize: 11,
  },
  tableBodyWrap: {
    width: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  thCell: {
    fontSize: 9.5,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  tableRowCancelled: {
    opacity: 0.45,
  },
  rowTrashBtn: {
    width: 22,
    height: 22,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTrashBtnDisabled: {
    opacity: 0.3,
  },
  boxTag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  boxTagText: {
    fontSize: 10.5,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  rowItemCode: {
    fontSize: 12,
    fontFamily: monoFont,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  rowDescText: {
    fontSize: 10,
    marginTop: 2,
    lineHeight: 13,
  },
  rowDeptText: {
    fontSize: 9,
    fontFamily: monoFont,
    marginTop: 1,
  },
  rowNum: {
    fontSize: 11.5,
    fontFamily: monoFont,
    fontWeight: '700',
  },
  packedQtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  packedQtyPillDisabled: {
    opacity: 0.5,
  },
  packedQtyText: {
    fontSize: 11.5,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  rowDiffText: {
    fontSize: 11.5,
    fontFamily: monoFont,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 8.5,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  dupItemDesc: {
    fontSize: 10.5,
    marginTop: 2,
  },
  rowTextCancelled: {
    textDecorationLine: 'line-through',
  },
  limitedCartFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderTopWidth: 1,
  },
  limitedCartFooterText: {
    fontSize: 11,
    fontFamily: monoFont,
    flex: 1,
  },
  statsCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: 10,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  statsTitle: {
    fontSize: 11,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  statsSubText: {
    fontSize: 10,
    fontFamily: monoFont,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  statBoxNum: {
    fontSize: 16,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  statBoxLabel: {
    fontSize: 9,
    fontFamily: monoFont,
    fontWeight: '700',
    marginTop: 2,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: borderRadius.lg,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: monoFont,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'center',
  },
});
