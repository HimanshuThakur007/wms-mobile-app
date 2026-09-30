import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { DocumentType } from '../../types';
import { borderRadius, spacing } from '../../constants/theme';

interface DocumentSelectSheetProps {
  visible: boolean;
  onClose: () => void;
  documents: DocumentType[];
  onSelectDocument: (doc: DocumentType) => void;
  title?: string;
  accentColor?: string;
  accentMutedColor?: string;
}

const monoFont = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' });
const SCREEN_HEIGHT = Dimensions.get('window').height;

export const DocumentSelectSheet: React.FC<DocumentSelectSheetProps> = ({
  visible,
  onClose,
  documents,
  onSelectDocument,
  title = 'Select Document',
  accentColor,
  accentMutedColor,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');

  const displayTitle = t(title);

  const accent = accentColor || colors.primary;
  const muted = accentMutedColor || colors.primaryMuted;

  const filteredDocs = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return documents;
    return documents.filter((d) => {
      const docNo = (d.doc_no || d.document_number || '').toLowerCase();
      const org = (d.organization_name || '').toLowerCase();
      const depts = Array.isArray(d.departments)
        ? d.departments.join(' ').toLowerCase()
        : String(d.departments || '').toLowerCase();
      return docNo.includes(q) || org.includes(q) || depts.includes(q);
    });
  }, [search, documents]);

  const handleSelect = (doc: DocumentType) => {
    onSelectDocument(doc);
    setSearch('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: colors.surface2,
                  borderColor: colors.border,
                  paddingBottom: Math.max(insets.bottom, 16),
                  maxHeight: SCREEN_HEIGHT * 0.85,
                },
              ]}
            >
              {/* Handle */}
              <View style={[styles.handle, { backgroundColor: colors.border }]} />

              {/* Header */}
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>{displayTitle}</Text>
                  <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                    {t('One document at a time')} · {filteredDocs.length} {t('available')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[styles.closeBtn, { backgroundColor: colors.surface3 }]}
                >
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View
                style={[
                  styles.searchWrap,
                  {
                    backgroundColor: colors.surface3,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  placeholder={t('Search document number or client...')}
                  placeholderTextColor={colors.textMuted}
                  value={search}
                  onChangeText={setSearch}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
                {search.length > 0 && Platform.OS !== 'ios' && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Document List */}
              <ScrollView
                style={styles.docList}
                contentContainerStyle={styles.docListContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              >
                {filteredDocs.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Ionicons name="document-text-outline" size={32} color={colors.textMuted} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      {t('No documents found')}
                    </Text>
                    <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                      {t('Try searching with another document number')}
                    </Text>
                  </View>
                ) : (
                  filteredDocs.map((doc, idx) => {
                    const docNumber = doc.doc_no || doc.document_number || 'N/A';
                    const orgName = doc.organization_name || 'General Logistics';
                    const depts: string[] = Array.isArray(doc.departments)
                      ? doc.departments
                      : typeof doc.departments === 'string' && (doc.departments as string).length > 0
                      ? (doc.departments as string).split(',').map((s: string) => s.trim())
                      : [];

                    return (
                      <TouchableOpacity
                        key={doc.id || `${docNumber}-${idx}`}
                        style={[
                          styles.docItem,
                          {
                            borderBottomColor: colors.border,
                            backgroundColor: idx % 2 === 1 ? colors.surface3 : 'transparent',
                          },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => handleSelect(doc)}
                      >
                        <View
                          style={[
                            styles.docIconWrap,
                            { backgroundColor: muted },
                          ]}
                        >
                          <Ionicons name="document-text" size={18} color={accent} />
                        </View>

                        <View style={styles.docInfo}>
                          <Text style={[styles.docNo, { color: colors.textPrimary }]}>
                            {docNumber}
                          </Text>
                          <Text
                            style={[styles.orgName, { color: colors.textSecondary }]}
                            numberOfLines={1}
                          >
                            {orgName}
                          </Text>
                          {depts.length > 0 && (
                            <Text style={[styles.deptCount, { color: colors.textMuted }]}>
                              {depts.length} {t('department(s) available')}
                            </Text>
                          )}
                        </View>

                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    fontFamily: monoFont,
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: monoFont,
  },
  docList: {
    flexGrow: 0,
  },
  docListContent: {
    paddingBottom: 20,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  docIconWrap: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: {
    flex: 1,
  },
  docNo: {
    fontSize: 13,
    fontFamily: monoFont,
    fontWeight: '800',
  },
  orgName: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  deptCount: {
    fontSize: 10,
    fontFamily: monoFont,
    marginTop: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 6,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 11,
    fontFamily: monoFont,
  },
});
