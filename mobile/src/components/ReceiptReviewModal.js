import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { OutlineButton, PrimaryButton } from './Ui'
import { STORAGE_LOCATIONS } from '../lib/inventoryDisplay'
import { colors } from '../theme'

export function ReceiptReviewModal({
  visible,
  scanning,
  storeName,
  items,
  busy,
  onChangeItem,
  onRemoveItem,
  onClose,
  onConfirm,
}) {
  const [selectedCount, setSelectedCount] = useState(0)

  useEffect(() => {
    setSelectedCount(items.filter((item) => item.selected && item.name.trim()).length)
  }, [items])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <Text style={styles.title}>{scanning ? 'Scanning receipt' : 'Receipt scanned'}</Text>
            <Pressable disabled={busy || scanning} onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          {scanning ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.status}>Reading grocery items…</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
              {storeName ? <Text style={styles.store}>{storeName}</Text> : null}
              <Text style={styles.hint}>
                Storage is a suggestion. Expiration is left blank unless you enter one. Nothing is saved until you add
                selected items.
              </Text>
              {items.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Pressable
                      onPress={() => onChangeItem(item.id, { selected: !item.selected })}
                      style={[styles.check, item.selected && styles.checkOn]}
                    >
                      <Text style={styles.checkMark}>{item.selected ? '✓' : ''}</Text>
                    </Pressable>
                    <TextInput
                      value={item.name}
                      onChangeText={(name) => onChangeItem(item.id, { name })}
                      placeholder="Item name"
                      placeholderTextColor={colors.muted}
                      style={[styles.input, styles.grow]}
                    />
                    <Pressable onPress={() => onRemoveItem(item.id)} hitSlop={8}>
                      <Text style={styles.remove}>Remove</Text>
                    </Pressable>
                  </View>
                  <View style={styles.row}>
                    <View style={styles.grow}>
                      <Text style={styles.label}>Qty</Text>
                      <TextInput
                        value={item.quantity}
                        onChangeText={(quantity) => onChangeItem(item.id, { quantity })}
                        keyboardType="decimal-pad"
                        style={styles.input}
                      />
                    </View>
                    <View style={styles.grow}>
                      <Text style={styles.label}>Unit</Text>
                      <TextInput
                        value={item.unit}
                        onChangeText={(unit) => onChangeItem(item.id, { unit })}
                        style={styles.input}
                      />
                    </View>
                  </View>
                  <Text style={styles.label}>Storage</Text>
                  <View style={styles.filters}>
                    {STORAGE_LOCATIONS.map((key) => (
                      <Pressable
                        key={key}
                        onPress={() => onChangeItem(item.id, { storage_location: key })}
                        style={[styles.chip, item.storage_location === key && styles.chipOn]}
                      >
                        <Text style={[styles.chipText, item.storage_location === key && styles.chipTextOn]}>
                          {key[0].toUpperCase() + key.slice(1)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.label}>Expiration (optional)</Text>
                  <TextInput
                    value={item.expiration_date}
                    onChangeText={(expiration_date) => onChangeItem(item.id, { expiration_date })}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>
              ))}
              <PrimaryButton
                disabled={busy || selectedCount === 0}
                label={busy ? 'Adding…' : `Add selected items (${selectedCount})`}
                onPress={onConfirm}
              />
              <OutlineButton disabled={busy} label="Cancel" onPress={onClose} />
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    marginBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, flex: 1, paddingRight: 12 },
  close: { color: colors.primary, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  status: { color: colors.muted },
  scroll: { paddingHorizontal: 20, paddingBottom: 28, gap: 10 },
  store: { fontWeight: '700', color: colors.text },
  hint: { color: colors.muted, fontSize: 13, marginBottom: 6 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    gap: 8,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  check: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
  checkOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  checkMark: { color: colors.primary, fontWeight: '800' },
  grow: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: colors.muted },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    backgroundColor: colors.cream,
    color: colors.text,
  },
  row: { flexDirection: 'row', gap: 8 },
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
  remove: { color: colors.urgent, fontWeight: '700', fontSize: 12 },
})
