import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Screen } from '../components/Screen'
import { Card, OutlineButton, PrimaryButton } from '../components/Ui'
import { InventoryFormModal } from '../components/InventoryFormModal'
import { ReceiptReviewModal } from '../components/ReceiptReviewModal'
import { useAuth } from '../lib/AuthContext'
import { expirationLabel, expirationTone, sortByExpiration } from '../lib/expiration'
import { guessLocation, normalizeCategory } from '../lib/guessStorage'
import { demoItemsFromSample, isValidDate, quantityLabel, STORAGE_LOCATIONS } from '../lib/inventoryDisplay'
import { parseReceiptOnServer, receiptDataUrlFromAsset } from '../lib/receiptScan'
import { supabase } from '../lib/supabase'
import { colors } from '../theme'

const FILTERS = ['all', ...STORAGE_LOCATIONS]

function parseDraft(draft) {
  const name = draft.name.trim()
  if (!name) return { error: 'Enter an item name.' }
  const quantity = Number(draft.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: 'Enter a quantity greater than 0.' }
  const expiration = draft.expiration_date.trim()
  if (expiration && !isValidDate(expiration)) return { error: 'Use expiration as YYYY-MM-DD, or leave it blank.' }
  if (!STORAGE_LOCATIONS.includes(draft.storage_location)) return { error: 'Choose fridge, freezer, or pantry.' }
  return {
    values: {
      name,
      quantity,
      unit: draft.unit.trim() || 'count',
      storage_location: draft.storage_location,
      expiration_date: expiration || null,
    },
  }
}

export function FridgeScreen({ embedded = false }) {
  const { demo, session } = useAuth()
  const userId = session?.user?.id ?? null

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [items, setItems] = useState(() => (demo ? demoItemsFromSample() : []))
  const [loading, setLoading] = useState(!demo)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanBusy, setScanBusy] = useState(false)
  const [scanItems, setScanItems] = useState([])
  const [scanStore, setScanStore] = useState('')
  const [scanPurchaseDate, setScanPurchaseDate] = useState(null)

  const loadRemote = useCallback(async () => {
    if (demo) return
    if (!supabase || !userId) {
      setItems([])
      setError('You need to be signed in to load your fridge.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    const { data, error: queryError } = await supabase
      .from('inventory_items')
      .select(
        'id, user_id, name, category, quantity, unit, storage_location, purchase_date, expiration_date, status, source, created_at, updated_at',
      )
      .eq('user_id', userId)
      .eq('status', 'available')
      .order('expiration_date', { ascending: true, nullsFirst: false })

    if (queryError) {
      setItems([])
      setError(queryError.message || 'Could not load your fridge.')
    } else {
      setItems(data ?? [])
    }
    setLoading(false)
  }, [demo, userId])

  useEffect(() => {
    if (demo) {
      setItems(demoItemsFromSample())
      setLoading(false)
      setError('')
      return
    }
    loadRemote()
  }, [demo, loadRemote])

  const visible = useMemo(() => {
    const filtered = items.filter((item) => {
      if (filter !== 'all' && item.storage_location !== filter) return false
      if (query && !item.name.toLowerCase().includes(query.trim().toLowerCase())) return false
      return true
    })
    return sortByExpiration(filtered)
  }, [filter, items, query])

  function openAdd() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(item) {
    setEditing(item)
    setFormOpen(true)
  }

  async function saveDraft(draft) {
    const parsed = parseDraft(draft)
    if (parsed.error) {
      Alert.alert('Check the form', parsed.error)
      return
    }

    if (demo) {
      if (editing) {
        setItems((prev) =>
          prev.map((item) => (item.id === editing.id ? { ...item, ...parsed.values } : item)),
        )
      } else {
        setItems((prev) => [{ id: `demo-${Date.now()}`, ...parsed.values }, ...prev])
      }
      setFormOpen(false)
      setEditing(null)
      return
    }

    if (!supabase || !userId) {
      Alert.alert('Could not save', 'You need to be signed in.')
      return
    }

    setSaving(true)
    if (editing) {
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          ...parsed.values,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editing.id)
        .eq('user_id', userId)
      setSaving(false)
      if (updateError) {
        Alert.alert('Could not save', updateError.message)
        return
      }
    } else {
      const { error: insertError } = await supabase.from('inventory_items').insert({
        user_id: userId,
        category: 'other',
        status: 'available',
        source: 'manual',
        ...parsed.values,
      })
      setSaving(false)
      if (insertError) {
        Alert.alert('Could not add item', insertError.message)
        return
      }
    }

    setFormOpen(false)
    setEditing(null)
    await loadRemote()
  }

  function confirmDelete(item) {
    Alert.alert('Remove this item from your fridge?', item.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => deleteItem(item),
      },
    ])
  }

  function closeScan() {
    if (scanning || scanBusy) return
    setScanOpen(false)
    setScanning(false)
    setScanItems([])
    setScanStore('')
    setScanPurchaseDate(null)
  }

  function startReceiptScan() {
    if (demo) {
      Alert.alert(
        'Sign in to save scanned groceries.',
        'Receipt Scan saves to your cloud fridge, so it is only available when you are signed in.',
      )
      return
    }
    Alert.alert('Receipt scan', 'Photograph a grocery receipt, then review items before they go in the fridge.', [
      { text: 'Take photo', onPress: () => void pickReceipt('camera') },
      { text: 'Choose from photos', onPress: () => void pickReceipt('library') },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  async function pickReceipt(source) {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync()
        if (!permission.granted) {
          Alert.alert('Camera permission needed', 'Allow camera access to photograph a receipt.')
          return
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!permission.granted) {
          Alert.alert('Photo permission needed', 'Allow photo access to choose a receipt.')
          return
        }
      }

      const pickerOptions = {
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      }
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(pickerOptions)
          : await ImagePicker.launchImageLibraryAsync(pickerOptions)
      if (result.canceled || !result.assets?.[0]) return

      setScanOpen(true)
      setScanning(true)
      setScanItems([])
      setScanStore('')
      setScanPurchaseDate(null)

      const dataUrl = await receiptDataUrlFromAsset(result.assets[0])
      const parsed = await parseReceiptOnServer(dataUrl)
      const next = (parsed.items || [])
        .filter((item) => item?.name?.trim())
        .map((item, index) => {
          const name = item.name.trim()
          const category = normalizeCategory(item.category, name)
          return {
            id: `scan-${Date.now()}-${index}`,
            selected: true,
            name,
            quantity: String(item.quantity && item.quantity > 0 ? item.quantity : 1),
            unit: item.unit?.trim() || 'count',
            category,
            storage_location: guessLocation(category),
            expiration_date: '',
          }
        })
      setScanItems(next)
      setScanStore(parsed.store_name || '')
      setScanPurchaseDate(parsed.purchase_date && isValidDate(parsed.purchase_date) ? parsed.purchase_date : null)
      setScanning(false)
      if (next.length === 0) {
        setScanOpen(false)
        Alert.alert('No grocery items found', 'Try another photo, or add items by hand.')
      }
    } catch (error) {
      setScanning(false)
      setScanOpen(false)
      Alert.alert('Could not scan receipt', error instanceof Error ? error.message : 'Try another photo.')
    }
  }

  async function confirmScannedItems() {
    const chosen = scanItems.filter((item) => item.selected && item.name.trim())
    if (chosen.length === 0) {
      Alert.alert('Select items', 'Choose at least one grocery item to add.')
      return
    }
    for (const item of chosen) {
      const quantity = Number(item.quantity)
      if (!Number.isFinite(quantity) || quantity <= 0) {
        Alert.alert('Check quantities', `Enter a quantity greater than 0 for ${item.name}.`)
        return
      }
      if (item.expiration_date.trim() && !isValidDate(item.expiration_date.trim())) {
        Alert.alert('Check dates', `Use YYYY-MM-DD for ${item.name}, or leave expiration blank.`)
        return
      }
    }

    if (!supabase || !userId) {
      Alert.alert('Could not save', 'You need to be signed in.')
      return
    }

    const rows = chosen.map((item) => ({
      user_id: userId,
      name: item.name.trim(),
      category: item.category || 'other',
      quantity: Number(item.quantity) || 1,
      unit: item.unit.trim() || 'count',
      storage_location: item.storage_location,
      purchase_date: scanPurchaseDate,
      expiration_date: item.expiration_date.trim() || null,
      status: 'available',
      source: 'receipt',
    }))

    setScanBusy(true)
    const { error: insertError } = await supabase.from('inventory_items').insert(rows)
    setScanBusy(false)
    if (insertError) {
      Alert.alert('Could not add scanned items', insertError.message)
      return
    }

    setScanOpen(false)
    setScanItems([])
    setScanStore('')
    setScanPurchaseDate(null)
    await loadRemote()
  }

  async function deleteItem(item) {
    if (demo) {
      setItems((prev) => prev.filter((row) => row.id !== item.id))
      setFormOpen(false)
      setEditing(null)
      return
    }

    if (!supabase || !userId) {
      Alert.alert('Could not remove', 'You need to be signed in.')
      return
    }

    const { error: deleteError } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', item.id)
      .eq('user_id', userId)

    if (deleteError) {
      Alert.alert('Could not remove', deleteError.message)
      return
    }

    setItems((prev) => prev.filter((row) => row.id !== item.id))
    setFormOpen(false)
    setEditing(null)
  }

  return (
    <Screen title="Fridge" subtitle="A picture of what you actually have." embedded={embedded}>
      {demo ? (
        <Text style={styles.demoNote}>Demo kitchen — changes stay on this phone and are not saved to the cloud.</Text>
      ) : null}

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search food"
        placeholderTextColor={colors.muted}
        style={styles.search}
      />
      <View style={styles.filters}>
        {FILTERS.map((key) => (
          <Pressable key={key} onPress={() => setFilter(key)} style={[styles.chip, filter === key && styles.chipOn]}>
            <Text style={[styles.chipText, filter === key && styles.chipTextOn]}>
              {key[0].toUpperCase() + key.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.actions}>
        <View style={styles.actionGrow}>
          <PrimaryButton label="Add item" onPress={openAdd} />
        </View>
        <View style={styles.actionGrow}>
          <OutlineButton
            label="Receipt scan"
            onPress={startReceiptScan}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.status}>Loading your fridge…</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
          <PrimaryButton label="Try again" onPress={loadRemote} />
        </Card>
      ) : null}

      {!loading && !error && visible.length === 0 ? (
        <Card>
          <Text style={styles.emptyTitle}>Your fridge is empty</Text>
          <Text style={styles.emptyBody}>Add an item to start tracking what you have.</Text>
        </Card>
      ) : null}

      {!loading &&
        !error &&
        visible.map((item) => {
          const tone = expirationTone(item.expiration_date)
          return (
            <Pressable key={item.id} onPress={() => openEdit(item)} onLongPress={() => confirmDelete(item)}>
              <Card style={styles.card}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {quantityLabel(item)} · {item.storage_location}
                </Text>
                <Text style={[styles.exp, styles[tone]]}>{expirationLabel(item.expiration_date)}</Text>
              </Card>
            </Pressable>
          )
        })}

      <InventoryFormModal
        visible={formOpen}
        title={editing ? 'Edit item' : 'Add item'}
        item={editing}
        busy={saving}
        onClose={() => {
          if (!saving) {
            setFormOpen(false)
            setEditing(null)
          }
        }}
        onSave={saveDraft}
        onDelete={editing ? () => confirmDelete(editing) : undefined}
      />
      <ReceiptReviewModal
        visible={scanOpen}
        scanning={scanning}
        storeName={scanStore}
        items={scanItems}
        busy={scanBusy}
        onChangeItem={(id, patch) =>
          setScanItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
        }
        onRemoveItem={(id) => setScanItems((prev) => prev.filter((item) => item.id !== id))}
        onClose={closeScan}
        onConfirm={() => void confirmScannedItems()}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  demoNote: { marginBottom: 12, color: colors.muted, fontSize: 13 },
  search: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 48,
    marginBottom: 12,
    color: colors.text,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
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
  actions: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  actionGrow: { flex: 1 },
  card: { marginBottom: 10 },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  meta: { marginTop: 4, color: colors.muted },
  exp: { marginTop: 8, fontWeight: '700' },
  expired: { color: colors.urgent },
  urgent: { color: colors.urgent },
  soon: { color: colors.soon },
  fresh: { color: colors.ok },
  center: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  status: { color: colors.muted },
  error: { color: colors.urgent, marginBottom: 12, fontWeight: '600' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptyBody: { marginTop: 6, color: colors.muted },
})
