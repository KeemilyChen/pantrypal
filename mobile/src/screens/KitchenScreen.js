import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FridgeScreen } from './FridgeScreen'
import { PlanScreen } from './PlanScreen'
import { ShoppingScreen } from './ShoppingScreen'
import { colors } from '../theme'

const TABS = [
  { id: 'fridge', label: 'Fridge' },
  { id: 'plan', label: 'Plan' },
  { id: 'shopping', label: 'Shopping' },
]

export function KitchenScreen() {
  const [tab, setTab] = useState('fridge')

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.segments}>
          {TABS.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setTab(item.id)}
              style={[styles.seg, tab === item.id && styles.segOn]}
            >
              <Text style={[styles.segText, tab === item.id && styles.segTextOn]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
      <View style={styles.body}>
        {tab === 'fridge' ? <FridgeScreen embedded /> : null}
        {tab === 'plan' ? <PlanScreen embedded /> : null}
        {tab === 'shopping' ? <ShoppingScreen embedded /> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  safe: { backgroundColor: colors.cream },
  segments: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 4,
    padding: 4,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  seg: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 999 },
  segOn: { backgroundColor: colors.card },
  segText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  segTextOn: { color: colors.text },
  body: { flex: 1 },
})
