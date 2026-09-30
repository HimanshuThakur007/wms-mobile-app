import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { useTheme } from '../../../src/context/ThemeContext';
import { useLanguage } from '../../../src/context/LanguageContext';
import { CancelItemModal } from '../../../src/components/scanning/modals/CancelItemModal';
import { EditQtyModal } from '../../../src/components/scanning/modals/EditQtyModal';
import { DuplicateItemModal } from '../../../src/components/scanning/modals/DuplicateItemModal';
import { HardwareScanInputCard } from '../../../src/components/scanning/HardwareScanInputCard';
import { ScanStatsGrid } from '../../../src/components/scanning/ScanStatsGrid';
import { WmsScanningHeader } from '../../../src/components/scanning/WmsScanningHeader';
import { WmsScannedItemsTable } from '../../../src/components/scanning/WmsScannedItemsTable';
import { WmsSubmitFooter } from '../../../src/components/scanning/WmsSubmitFooter';
import { ScanReportModal } from '../../../src/components/scanning/modals/ScanReportModal';
import { PendingItemsModal } from '../../../src/components/scanning/modals/PendingItemsModal';
import { useHardwareScanner } from '../../../src/hooks/useHardwareScanner';
import { useWmsScanningSession } from '../../../src/hooks/useWmsScanningSession';
import { getStatusBadge } from '../../../src/utils/scanHelpers';

export default function WmsScanningScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const documentNumber = String(params.document_number || '');
  const organizationName = String(params.organization_name || 'Organization');
  const departmentsParam = String(params.departments || '');
  const userId = params.user_id ? Number(params.user_id) : (user?.id ? Number(user.id) : 1);

  const departments = departmentsParam
    ? departmentsParam
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const session = useWmsScanningSession({
    documentNumber,
    organizationName,
    departments,
    userId,
    userGroup: String(user?.userGroup || 'B'),
  });

  const scanner = useHardwareScanner({
    onProcessBarcode: session.handleProcessBarcode,
    isModalOpen: session.isAnyModalOpen,
  });

  const getStatusBadgeHelper = useCallback(
    (status: string) => getStatusBadge(status, colors, t),
    [colors, t]
  );

  // Track modal transitions to clear input buffer and refocus scanner input
  const prevModalOpenRef = useRef(session.isAnyModalOpen);
  useEffect(() => {
    if (prevModalOpenRef.current && !session.isAnyModalOpen) {
      scanner.clearAndRefocus();
    }
    prevModalOpenRef.current = session.isAnyModalOpen;
  }, [session.isAnyModalOpen, scanner]);

  // Focus input when box changes
  useEffect(() => {
    const timer = setTimeout(() => {
      scanner.inputRef.current?.focus();
    }, 350);
    return () => clearTimeout(timer);
  }, [session.currentBox, scanner.inputRef]);

  const progressPct =
    session.summary.requested_qty > 0
      ? Math.min(100, Math.round((session.summary.packed_qty / session.summary.requested_qty) * 100))
      : session.summary.total_items > 0
      ? Math.min(100, Math.round((session.summary.scanned_items / session.summary.total_items) * 100))
      : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Sticky Header */}
        <WmsScanningHeader
          documentNumber={documentNumber}
          departments={departments}
          scannedCount={session.allScannedItems.filter((i) => i.itemstatus !== 'cancelled').length}
          packedQty={session.summary.packed_qty}
          requestedQty={session.summary.requested_qty}
          totalItems={session.summary.total_items}
          progressPct={progressPct}
          currentBox={session.currentBox}
          formattedBoxNo={session.getFormattedBoxNoStr(session.currentBox)}
          onBack={() => router.back()}
          onPrevBox={() => session.currentBox > 1 && session.setCurrentBox(session.currentBox - 1)}
          onNextBox={() => session.setCurrentBox(session.currentBox + 1)}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hardware Scanner Input Card */}
          <HardwareScanInputCard
            inputRef={scanner.inputRef}
            itemCode={scanner.itemCode}
            inputFocused={scanner.inputFocused}
            scanning={scanner.scanning}
            accentColor={colors.primary}
            title={t('Hardware Scanner')}
            subtitle={`${t('Box')} ${session.getFormattedBoxNoStr(session.currentBox)} · ${scanner.inputFocused ? t('Ready for laser barcode scan') : t('Tap to focus scanner')}`}
            onChangeText={scanner.handleTextChange}
            onSubmitEditing={() => {
              const code = scanner.barcodeBufferRef.current || scanner.itemCode;
              if (code.trim()) {
                scanner.processBarcodeInternal(code);
              }
            }}
            onFocus={() => scanner.setInputFocused(true)}
            onBlur={() => {
              scanner.setInputFocused(false);
              if (!session.isAnyModalOpen) {
                setTimeout(() => scanner.inputRef.current?.focus(), 60);
              }
            }}
          />

          {/* Scanned Manifest Table */}
          <WmsScannedItemsTable
            allScannedItems={session.allScannedItems}
            showAllCartItems={session.showAllCartItems}
            loading={session.loading}
            revisedItemIds={session.revisedItemIds}
            skuStatsMap={session.skuStatsMap}
            formatItemBoxNo={session.formatItemBoxNoStr}
            getStatusBadge={getStatusBadgeHelper}
            onToggleShowAllCartItems={() => session.setShowAllCartItems(!session.showAllCartItems)}
            onReload={session.loadInitialSessionAndPicklist}
            onOpenCancelModal={session.openCancelModal}
            onOpenEditQtyModal={session.openEditQtyModal}
          />

          {/* Statistics Grid */}
          <ScanStatsGrid
            summary={session.summary}
            onFilterSelect={(filter) => {
              session.setReportFilter(filter);
              session.setReportModalVisible(true);
            }}
          />

          {/* Submit Footer (Included inside ScrollView at the end of scroll content) */}
          <WmsSubmitFooter
            scannedCount={session.allScannedItems.filter((i) => i.itemstatus !== 'cancelled').length}
            packedQty={session.summary.packed_qty}
            submitting={session.submitting}
            onMarkPendingZero={session.handleOpenPendingCheck}
            onSubmit={session.handleOpenPendingCheck}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODALS */}
      <CancelItemModal
        visible={session.cancelModalVisible}
        remarks={session.cancelRemarks}
        onRemarksChange={session.setCancelRemarks}
        onClose={() => session.setCancelModalVisible(false)}
        onConfirm={session.handleCancelItem}
      />

      <EditQtyModal
        visible={session.editQtyVisible}
        itemCode={session.editQtyItem?.itemcode}
        requestedQty={session.editQtyItem?.requested_quantity}
        value={session.editQtyValue}
        onValueChange={session.setEditQtyValue}
        onClose={() => session.setEditQtyVisible(false)}
        onConfirm={session.handleUpdatePackedQty}
      />

      <DuplicateItemModal
        visible={session.duplicateVisible}
        item={session.duplicateItem}
        quantity={session.duplicateQty}
        saving={session.duplicateSaving}
        onQuantityChange={session.setDuplicateQty}
        onClose={() => session.setDuplicateVisible(false)}
        onConfirm={() => {
          session.handleDuplicateInsert();
          scanner.resetScannerHistory();
        }}
      />

      <PendingItemsModal
        visible={session.pendingModalVisible}
        markingPending={session.submitting}
        pendingCountDisplay={session.pendingCountDisplay}
        markingProgressText={session.submitting ? t('Submitting...') : ''}
        onClose={() => session.setPendingModalVisible(false)}
        onConfirmMarkZeroAndSubmit={session.executeSubmitScan}
      />

      <ScanReportModal
        visible={session.reportModalVisible}
        reportFilter={session.reportFilter}
        cleanDoc={session.cleanDoc}
        summary={session.summary}
        reportItems={session.reportItems}
        revisedItemIds={session.revisedItemIds}
        skuStatsMap={session.skuStatsMap}
        formatItemBoxNo={session.formatItemBoxNoStr}
        getStatusBadge={getStatusBadgeHelper}
        onFilterChange={session.setReportFilter}
        onClose={() => session.setReportModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
});
