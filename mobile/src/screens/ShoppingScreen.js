import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Screen } from '../components/Screen'
import { colors } from '../theme'
import { shoppingSeed } from '../data/sample'

export function ShoppingScreen({ embedded = false }) {
  const [name, setName] = useState('')
  const [items, setItems] = useState(shoppingSeed)

  function addItem() {
    const value = name.trim()
    if (!value) return
    setItems((prev) => [{ id: String(Date.now()), name: value, checked: false }, ...prev])
    setName('')
  }

  function toggle(id) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)))
  }

  return (
    <Screen title="Shopping" subtitle="Manual items and meal-plan gaps." embedded={embedded}>
      <View style={styles.addRow}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Add milk, limes…"
          placeholderTextColor={colors.muted}
          style={styles.input}
          onSubmitEditing={addItem}
        />
        <Pressable onPress={addItem} style={styles.addBtn}>
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      </View>
      {items.map((item) => (
        <Pressable key={item.id} onPress={() => toggle(item.id)} style={styles.row}>
          <View style={[styles.box, item.checked && styles.boxOn]} />
          <Text style={[styles.itemName, item.checked && styles.checked]}>{item.name}</Text>
        </Pressable>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 48,
    color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { color: '#fff', fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    minHeight: 52,
  },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.primary },
  boxOn: { backgroundColor: colors.primary },
  itemName: { fontSize: 16, color: colors.text, fontWeight: '600' },
  checked: { textDecorationLine: 'line-through', color: colors.muted },
})
