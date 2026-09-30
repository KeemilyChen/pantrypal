import { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { OutlineButton, PrimaryButton } from './Ui'
import { STORAGE_LOCATIONS } from '../lib/inventoryDisplay'
import { colors } from '../theme'

const emptyDraft = {
  name: '',
  quantity: '1',
  unit: 'count',
  storage_location: 'fridge',
  expiration_date: '',
}

export function InventoryFormModal({ visible, title, item, busy, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(emptyDraft)

  useEffect(() => {
    if (!visible) return
    if (item) {
      setDraft({
        name: item.name ?? '',
        quantity: item.quantity == null ? '1' : String(item.quantity),
        unit: item.unit || 'count',
        storage_location: item.storage_location || 'fridge',
        expiration_date: item.expiration_date ? String(item.expiration_date).slice(0, 10) : '',
      })
    } else {
      setDraft(emptyDraft)
    }
  }, [visible, item])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Name</Text>
          <TextInput
            value={draft.name}
            onChangeText={(name) => setDraft((prev) => ({ ...prev, name }))}
            placeholder="Milk"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />

          <View style={styles.row}>
            <View style={styles.grow}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                value={draft.quantity}
                onChangeText={(quantity) => setDraft((prev) => ({ ...prev, quantity }))}
                keyboardType="decimal-pad"
                placeholder="1"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </View>
            <View style={styles.grow}>
              <Text style={styles.label}>Unit</Text>
              <TextInput
                value={draft.unit}
                onChangeText={(unit) => setDraft((prev) => ({ ...prev, unit }))}
                placeholder="count"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </View>
          </View>

          <Text style={styles.label}>Storage</Text>
          <View style={styles.filters}>
            {STORAGE_LOCATIONS.map((key) => (
              <Pressable
                key={key}
                onPress={() => setDraft((prev) => ({ ...prev, storage_location: key }))}
                style={[styles.chip, draft.storage_location === key && styles.chipOn]}
              >
                <Text style={[styles.chipText, draft.storage_location === key && styles.chipTextOn]}>
                  {key[0].toUpperCase() + key.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Expiration date</Text>
          <TextInput
            value={draft.expiration_date}
            onChangeText={(expiration_date) => setDraft((prev) => ({ ...prev, expiration_date }))}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            style={styles.input}
          />

          <View style={styles.actions}>
            <PrimaryButton disabled={busy} label={busy ? 'Saving…' : 'Save'} onPress={() => onSave(draft)} />
            <OutlineButton disabled={busy} label="Cancel" onPress={onClose} />
            {item && onDelete ? (
              <Pressable disabled={busy} onPress={onDelete} style={styles.remove}>
                <Text style={styles.removeText}>Remove from fridge</Text>
              </Pressable>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, paddingHorizontal: 20 },
  safe: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  close: { color: colors.primary, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 10 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 16,
  },
  row: { flexDirection: 'row', gap: 10 },
  grow: { flex: 1 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { color: colors.muted, fontWeight: '600' },
  chipTextOn: { color: colors.primary },
  actions: { marginTop: 24, gap: 10 },
  remove: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: colors.urgent, fontWeight: '700' },
})
