import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ThemeColors, useAppTheme } from './theme';

function parseDate(value: string) {
  if (!value) return new Date();
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1, 12);
}
function dateKey(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
}

export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [open, setOpen] = useState(false);
  const current = parseDate(value);
  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    setOpen(false);
    if (event.type === 'set' && selected) onChange(dateKey(selected));
  };
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Pumili ng petsa para sa ${label}`} onPress={() => setOpen(true)} style={styles.button}><Ionicons name="calendar-outline" size={17} color={colors.green}/><Text style={[styles.value, !value && styles.placeholder]}>{value ? current.toLocaleDateString('fil-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Pumili ng petsa'}</Text><Ionicons name="chevron-down" size={15} color={colors.muted}/></Pressable>{open ? <DateTimePicker value={current} mode="date" display="default" onChange={onPickerChange} /> : null}</View>;
}

export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [open, setOpen] = useState(false);
  const [hours, minutes] = value.split(':').map(Number);
  const current = new Date(); current.setHours(hours || 9, minutes || 0, 0, 0);
  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    setOpen(false);
    if (event.type === 'set' && selected) onChange(`${`${selected.getHours()}`.padStart(2, '0')}:${`${selected.getMinutes()}`.padStart(2, '0')}`);
  };
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Pumili ng oras para sa ${label}`} onPress={() => setOpen(true)} style={styles.button}><Ionicons name="time-outline" size={17} color={colors.green}/><Text style={styles.value}>{value || 'Pumili ng oras'}</Text><Ionicons name="chevron-down" size={15} color={colors.muted}/></Pressable>{open ? <DateTimePicker value={current} mode="time" display="default" onChange={onPickerChange} /> : null}</View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  field: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: colors.ink, marginTop: 11, marginBottom: 6 },
  button: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  value: { flex: 1, fontSize: 12, color: colors.ink },
  placeholder: { color: colors.muted },
});
