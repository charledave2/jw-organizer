import { AppText as Text, AppTextInput as TextInput } from './AppText';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemeColors, useAppTheme } from './theme';

const prefix = 'JWRT1:';

export function plainText(value: string) {
  if (!value.startsWith(prefix)) return value;
  try {
    const parsed = JSON.parse(value.slice(prefix.length));
    if (Array.isArray(parsed)) return parsed.filter((item) => item && typeof item.text === 'string').map((item) => item.text).join('\n');
  } catch { /* Keep an unreadable legacy value visible instead of dropping it. */ }
  return value;
}

export function RichTextPreview({ value, style, numberOfLines }: { value: string; style?: object; numberOfLines?: number }) {
  const text = useMemo(() => plainText(value), [value]);
  return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;
}

export function RichTextEditor({ value, onChange, placeholder, minHeight = 150 }: { value: string; onChange: (value: string) => void; placeholder: string; minHeight?: number }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const text = useMemo(() => plainText(value), [value]);
  return <View style={[styles.editor, { minHeight }]}><TextInput value={text} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} multiline textAlignVertical="top" style={styles.input} /></View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  editor: { borderWidth: 1, borderColor: colors.line, borderRadius: 13, overflow: 'hidden', padding: 12, marginTop: 7, backgroundColor: colors.surface },
  input: { minHeight: 65, padding: 0, fontSize: 13, lineHeight: 21, color: colors.ink },
});
