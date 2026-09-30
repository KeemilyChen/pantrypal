import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Screen } from '../components/Screen'
import { Card, OutlineButton } from '../components/Ui'
import { colors } from '../theme'
import { useAuth } from '../lib/AuthContext'
import { deletePlanSlot, fetchPlan } from '../lib/community'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack']
const SAMPLE_MEALS = {
  breakfast: 'Spinach Omelette',
  lunch: null,
  dinner: 'Chicken Stir Fry',
  snack: null,
}

function startOfMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay())
  const days = []
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    days.push(date)
  }
  return days
}

function keyFor(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function PlanScreen({ embedded = false }) {
  const { demo, session } = useAuth()
  const accessToken = session?.access_token
  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(today)
  const [slots, setSlots] = useState([])
  const [message, setMessage] = useState('')
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const days = useMemo(() => startOfMonthGrid(year, month), [year, month])
  const selectedKey = keyFor(selected)
  const cloud = Boolean(accessToken && !demo)

  async function load() {
    if (!cloud) return
    try {
      const data = await fetchPlan({ accessToken, from: keyFor(new Date(year, month, 1)), to: keyFor(new Date(year, month + 1, 0)) })
      setSlots(data.slots || [])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load plan.')
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, demo, year, month])

  function slotFor(meal) {
    return slots.find((item) => item.date === selectedKey && item.mealType === meal)
  }

  return (
    <Screen embedded={embedded} title="Today" subtitle={cloud ? 'What are you eating today? Calendar is below.' : 'What are you eating today?'}>
      <Text style={styles.selectedLabel}>
        {selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </Text>
      {MEALS.map((meal) => {
        const slot = cloud ? slotFor(meal) : SAMPLE_MEALS[meal]
        return (
          <Card key={meal} style={styles.meal}>
            <Text style={styles.mealType}>{meal}</Text>
            <Text style={styles.mealValue}>
              {cloud ? slot?.recipeName || '+ Add from Explore' : slot ?? '+ Add meal'}
            </Text>
            {cloud && slot ? (
              <Pressable
                onPress={() => {
                  void deletePlanSlot({ accessToken, id: slot.id }).then(load)
                }}
              >
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            ) : null}
          </Card>
        )
      })}
      <Text style={styles.calendarLabel}>Calendar</Text>
      <View style={styles.monthRow}>
        <Pressable onPress={() => setCursor(new Date(year, month - 1, 1))} style={styles.monthBtn}>
          <Text style={styles.monthBtnText}>←</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{cursor.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</Text>
        <Pressable onPress={() => setCursor(new Date(year, month + 1, 1))} style={styles.monthBtn}>
          <Text style={styles.monthBtnText}>→</Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={styles.weekday}>
            {day}
          </Text>
        ))}
        {days.map((date) => {
          const inMonth = date.getMonth() === month
          const isSelected = keyFor(date) === selectedKey
          const isToday = keyFor(date) === keyFor(today)
          const count = cloud
            ? slots.filter((item) => item.date === keyFor(date)).length
            : inMonth && date.getDate() % 7 === 2
              ? 2
              : inMonth && date.getDate() % 11 === 0
                ? 1
                : 0
          return (
            <Pressable
              key={keyFor(date)}
              disabled={!inMonth}
              onPress={() => setSelected(date)}
              style={[styles.cell, isToday && styles.today, isSelected && styles.selected]}
            >
              <Text style={[styles.cellText, !inMonth && styles.dim]}>{inMonth ? date.getDate() : ''}</Text>
              <View style={styles.dots}>
                {Array.from({ length: Math.min(count, 4) }).map((_, index) => (
                  <View key={index} style={styles.dot} />
                ))}
              </View>
            </Pressable>
          )
        })}
      </View>
      {cloud ? <OutlineButton label="Refresh" onPress={() => void load()} /> : null}
      {message ? <Text style={styles.meta}>{message}</Text> : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  monthBtnText: { fontSize: 20, color: colors.text },
  monthTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 8, marginBottom: 16 },
  weekday: { width: '14.28%', textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.muted, marginBottom: 6 },
  cell: { width: '14.28%', minHeight: 44, alignItems: 'center', paddingVertical: 4, borderRadius: 12 },
  today: { backgroundColor: colors.primarySoft },
  selected: { borderWidth: 1, borderColor: colors.primary },
  cellText: { color: colors.text, fontWeight: '600' },
  dim: { color: 'transparent' },
  dots: { flexDirection: 'row', height: 8, gap: 2, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary },
  selectedLabel: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 10 },
  calendarLabel: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: 8, marginBottom: 8, textTransform: 'uppercase' },
  meal: { marginBottom: 10 },
  mealType: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  mealValue: { marginTop: 6, fontSize: 16, fontWeight: '600', color: colors.text },
  remove: { marginTop: 8, color: colors.urgent, fontWeight: '600' },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginTop: 8,
    color: colors.text,
  },
  meta: { color: colors.muted, marginTop: 12 },
})
