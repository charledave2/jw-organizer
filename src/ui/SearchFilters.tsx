import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from './theme';

export function SearchInput({ value, onChangeText, placeholder = 'Maghanap…' }: { value: string; onChangeText: (value: string) => void; placeholder?: string }) {
  return <View style={styles.search}>
    <Ionicons name="search-outline" size={18} color={colors.muted} />
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} style={styles.input} returnKeyType="search" />
    {value ? <Pressable accessibilityLabel="I-clear ang paghahanap" onPress={() => onChangeText('')}><Ionicons name="close-circle" size={18} color={colors.muted} /></Pressable> : null}
  </View>;
}

export function FilterRow<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{options.map((option) => <Pressable key={option.value} onPress={() => onChange(option.value)} style={[styles.filter, value === option.value && styles.filterActive]}><Text style={[styles.filterText, value === option.value && styles.filterTextActive]}>{option.label}</Text></Pressable>)}</ScrollView>;
}

const styles = StyleSheet.create({
  search: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, marginTop: 13, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  input: { flex: 1, paddingVertical: 9, color: colors.ink, fontSize: 13 },
  filters: { gap: 7, paddingTop: 9, paddingBottom: 3 },
  filter: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  filterActive: { backgroundColor: colors.greenSoft, borderColor: colors.greenSoft },
  filterText: { fontSize: 11, fontWeight: '600', color: colors.muted },
  filterTextActive: { color: colors.greenDark },
});
