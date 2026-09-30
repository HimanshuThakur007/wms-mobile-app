import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { AppHeader } from '../common/AppHeader';

interface WmsScanningHeaderProps {
  documentNumber: string;
  departments: string[];
  scannedCount: number;
  packedQty: number;
  requestedQty: number;
  totalItems: number;
  progressPct: number;
  currentBox: number;
  formattedBoxNo: string;
  onBack: () => void;
  onPrevBox: () => void;
  onNextBox: () => void;
}

export const WmsScanningHeader: React.FC<WmsScanningHeaderProps> = ({
  documentNumber,
  departments,
  scannedCount,
  packedQty,
  requestedQty,
  totalItems,
  progressPct,
  currentBox,
  formattedBoxNo,
  onBack,
  onPrevBox,
  onNextBox,
}) => {
  const { t } = useLanguage();

  return (
    <AppHeader
      showBack
      onBack={onBack}
      moduleTag={t('WMS PACKING — SCANNING')}
      docNumber={documentNumber || t('No Document')}
      departments={departments}
      countNumber={scannedCount}
      countLabel={t('scanned')}
      packedQty={packedQty}
      requestedQty={requestedQty}
      totalItems={totalItems}
      progressPct={progressPct}
      boxLabel={t('CURRENT BOX')}
      currentBoxStr={formattedBoxNo}
      onPrevBox={onPrevBox}
      onNextBox={onNextBox}
      disablePrevBox={currentBox <= 1}
      showLogo
      showActions
    />
  );
};
