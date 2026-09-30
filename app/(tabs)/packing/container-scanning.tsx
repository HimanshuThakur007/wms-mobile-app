import React, { useEffect, useRef } from 'react';
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
import { ContainerHeader } from '../../../src/components/scanning/container/ContainerHeader';
import { PalletNavBar } from '../../../src/components/scanning/container/PalletNavBar';
import { ContainerManifestTable } from '../../../src/components/scanning/container/ContainerManifestTable';
import { ContainerReportModal } from '../../../src/components/scanning/container/ContainerReportModal';
import { useHardwareScanner } from '../../../src/hooks/useHardwareScanner';
import { useContainerScanningSession } from '../../../src/hooks/useContainerScanningSession';

export default function ContainerScanningScreen() {
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

  const session = useContainerScanningSession({
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

  // Track modal open/closed transitions to clear input buffer and refocus scanner input
  const prevModalOpenRef = useRef(session.isAnyModalOpen);
  useEffect(() => {
    if (prevModalOpenRef.current && !session.isAnyModalOpen) {
      scanner.clearAndRefocus();
    }
    prevModalOpenRef.current = session.isAnyModalOpen;
  }, [session.isAnyModalOpen, scanner]);

  // Focus input when pallet changes
  useEffect(() => {
    const timer = setTimeout(() => {
      scanner.inputRef.current?.focus();
    }, 350);
    return () => clearTimeout(timer);
  }, [session.currentPallet, scanner.inputRef]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Sticky Header & Pallet Navigation */}
        <View style={{ width: '100%', zIndex: 10 }}>
          <ContainerHeader
            documentNumber={documentNumber}
            departments={departments}
            loadedItemsCount={session.allScannedItems.filter((i) => i.itemstatus !== 'cancelled').length}
            packedQty={session.summary.packed_qty}
            requestedQty={session.summary.requested_qty}
            totalItems={session.summary.total_items}
            progressPct={session.progressPct}
            onBack={() => router.back()}
          />

          <PalletNavBar
            currentPallet={session.currentPallet}
            formattedBoxNo={session.getFormattedBoxNoStr(session.currentPallet)}
            packedQty={session.summary.packed_qty}
            requestedQty={session.summary.requested_qty || session.summary.total_items}
            progressPct={session.progressPct}
            onPrev={() => session.currentPallet > 1 && session.setCurrentPallet(session.currentPallet - 1)}
            onNext={() => session.setCurrentPallet(session.currentPallet + 1)}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hardware Scanner Card */}
          <HardwareScanInputCard
            inputRef={scanner.inputRef}
            itemCode={scanner.itemCode}
            inputFocused={scanner.inputFocused}
            scanning={scanner.scanning}
            accentColor={colors.amber}
            title={t('Hardware Scanner')}
            subtitle={`${t('Tier')} ${session.getFormattedBoxNoStr(session.currentPallet)} · ${scanner.inputFocused ? t('Ready for laser barcode scan') : t('Tap to focus scanner')}`}
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

          {/* Scanned Items Manifest Table */}
          <ContainerManifestTable
            allScannedItems={session.allScannedItems}
            loading={session.loading}
            showAllCartItems={session.showAllCartItems}
            setShowAllCartItems={session.setShowAllCartItems}
            onReload={session.loadInitialSessionAndPicklist}
            onOpenCancelModal={session.openCancelModal}
            onOpenEditQtyModal={session.openEditQtyModal}
            formatItemBoxNo={session.formatItemBoxNoStr}
            revisedItemIds={session.revisedItemIds}
            skuStatsMap={session.skuStatsMap}
          />

          {/* Container Statistics Grid */}
          <ScanStatsGrid
            summary={session.summary}
            title={t('CONTAINER STATISTICS')}
            onFilterSelect={(filter) => {
              session.setReportFilter(filter);
              session.setReportModalVisible(true);
            }}
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

      <ContainerReportModal
        visible={session.reportModalVisible}
        onClose={() => session.setReportModalVisible(false)}
        cleanDoc={session.cleanDoc}
        summary={session.summary}
        reportFilter={session.reportFilter}
        setReportFilter={session.setReportFilter}
        reportItems={session.reportItems}
        skuStatsMap={session.skuStatsMap}
        revisedItemIds={session.revisedItemIds}
        formatItemBoxNo={session.formatItemBoxNoStr}
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
