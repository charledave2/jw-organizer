import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ThemeColors, useAppTheme } from './theme';

export type RichTextBlock = { text: string; color?: string; highlight?: string };
const prefix = 'JWRT1:';
export const textPalette = ['#202522', '#2457C5', '#6B3FA0', '#B42318', '#087443', '#B54708'];
export const highlightPalette = ['#FFF0A6', '#C8F7DC', '#CDE8FF', '#F4D7FF', '#FFD6D6', '#FFE2C2'];

export function decodeRichText(value: string): RichTextBlock[] {
  if (value.startsWith(prefix)) {
    try { const parsed = JSON.parse(value.slice(prefix.length)); if (Array.isArray(parsed)) return parsed.filter((item) => item && typeof item.text === 'string'); } catch { /* Treat malformed rich text as ordinary text. */ }
  }
  return [{ text: value }];
}
export function encodeRichText(blocks: RichTextBlock[]) {
  const normalized = blocks.map((block) => ({ text: block.text, ...(block.color ? { color: block.color } : {}), ...(block.highlight ? { highlight: block.highlight } : {}) }));
  if (normalized.length === 1 && !normalized[0].color && !normalized[0].highlight) return normalized[0].text;
  return prefix + JSON.stringify(normalized);
}
export function plainText(value: string) { return decodeRichText(value).map((block) => block.text).join('\n'); }
export function RichTextPreview({ value, style, numberOfLines }: { value: string; style?: object; numberOfLines?: number }) {
  const { colors } = useAppTheme();
  const blocks = useMemo(() => decodeRichText(value), [value]);
  return <Text style={style} numberOfLines={numberOfLines}>{blocks.map((block, index) => <Text key={index} style={{ color: block.color ?? colors.ink, backgroundColor: block.highlight }}>{block.text}{index < blocks.length - 1 ? '\n' : ''}</Text>)}</Text>;
}

export function RichTextEditor({ value, onChange, placeholder, minHeight = 150 }: { value: string; onChange: (value: string) => void; placeholder: string; minHeight?: number }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const blocks = decodeRichText(value);
  const [active, setActive] = useState(0);
  const update = (index: number, patch: Partial<RichTextBlock>) => onChange(encodeRichText(blocks.map((block, i) => i === index ? { ...block, ...patch } : block)));
  const current = blocks[Math.min(active, blocks.length - 1)] ?? { text: '' };
  return <View>
    <Text style={styles.label}>Text color</Text>
    <View style={styles.palette}>{textPalette.map((color) => <Pressable key={color} accessibilityRole="button" accessibilityLabel={`Set text color ${color}`} onPress={() => update(active, { color })} style={[styles.swatch, { backgroundColor: color }, current.color === color && styles.selectedSwatch]} />)}</View>
    <Text style={styles.label}>Highlight</Text>
    <View style={styles.palette}>{highlightPalette.map((color) => <Pressable key={color} accessibilityRole="button" accessibilityLabel={`Set highlight color ${color}`} onPress={() => update(active, { highlight: color })} style={[styles.swatch, { backgroundColor: color }, current.highlight === color && styles.selectedSwatch]} />)}<Pressable accessibilityRole="button" accessibilityLabel="Remove highlight" onPress={() => update(active, { highlight: undefined })} style={[styles.clearHighlight, !current.highlight && styles.selectedSwatch]}><Text style={styles.clearText}>None</Text></Pressable></View>
    <View style={[styles.editor, { minHeight }]}>{blocks.map((block, index) => <TextInput key={index} value={block.text} onFocus={() => setActive(index)} onChangeText={(text) => update(index, { text })} placeholder={index === 0 ? placeholder : ''} placeholderTextColor={colors.muted} multiline textAlignVertical="top" style={[styles.input, { color: block.color ?? colors.ink, backgroundColor: block.highlight ?? 'transparent' }]} />)}</View>
    <Pressable onPress={() => { const next = [...blocks, { text: '' }]; onChange(encodeRichText(next)); setActive(next.length - 1); }} style={styles.addBlock}><Text style={styles.addBlockText}>+ Add formatted paragraph</Text></Pressable>
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({ label: { fontSize: 11, fontWeight: '700', color: colors.ink, marginTop: 11, marginBottom: 6 }, palette: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 9, marginBottom: 4 }, swatch: { width: 25, height: 25, borderRadius: 9, borderWidth: 1, borderColor: colors.line }, selectedSwatch: { borderWidth: 3, borderColor: colors.green }, clearHighlight: { minWidth: 42, height: 25, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }, clearText: { fontSize: 9, color: colors.muted }, editor: { borderWidth: 1, borderColor: colors.line, borderRadius: 13, overflow: 'hidden', padding: 9, marginTop: 7, backgroundColor: colors.surface }, input: { minHeight: 42, padding: 3, fontSize: 13, lineHeight: 21 }, addBlock: { alignSelf: 'flex-start', paddingVertical: 9 }, addBlockText: { color: colors.green, fontSize: 11, fontWeight: '700' } });
