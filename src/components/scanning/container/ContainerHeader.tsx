import React from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { AppHeader } from '../../common/AppHeader';

interface ContainerHeaderProps {
  documentNumber: string;
  departments: string[];
  loadedItemsCount: number;
  packedQty: number;
  requestedQty: number;
  totalItems: number;
  progressPct: number;
  onBack: () => void;
}

export function ContainerHeader({
  documentNumber,
  departments,
  loadedItemsCount,
  packedQty,
  requestedQty,
  totalItems,
  progressPct,
  onBack,
}: ContainerHeaderProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <AppHeader
      showBack
      onBack={onBack}
      moduleTag={t('CONTAINER PACKING — LOADING')}
      moduleTagColor={colors.amber}
      docNumber={documentNumber || t('No Container')}
      departments={departments}
      countNumber={loadedItemsCount}
      countLabel={t('items loaded')}
      countColor={colors.amber}
      packedQty={packedQty}
      requestedQty={requestedQty}
      totalItems={totalItems}
      progressPct={progressPct}
      accentColor={colors.amber}
      showLogo
      showActions
    />
  );
}
