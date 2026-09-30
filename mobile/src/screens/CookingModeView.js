import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Screen } from '../components/Screen'
import { parseStepMinutes } from '../lib/stepTimer'
import { colors } from '../theme'

function formatClock(seconds) {
  const safe = Math.max(0, seconds)
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

export function CookingModeView({ recipeName, steps, onClose, onFinish }) {
  const [index, setIndex] = useState(0)
  const [remaining, setRemaining] = useState(null)
  const [running, setRunning] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const list = Array.isArray(steps) ? steps : []
  const step = list[index] ?? ''
  const minutes = parseStepMinutes(step)
  const last = list.length > 0 && index >= list.length - 1
  const progress = list.length ? ((index + 1) / list.length) * 100 : 0

  useEffect(() => {
    setRemaining(null)
    setRunning(false)
  }, [index])

  useEffect(() => {
    if (!running || remaining == null) return
    if (remaining <= 0) {
      setRunning(false)
      return
    }
    const id = setTimeout(() => setRemaining((value) => (value == null ? value : value - 1)), 1000)
    return () => clearTimeout(id)
  }, [running, remaining])

  return (
    <Screen title="Cooking" subtitle={recipeName || ''} scroll>
      <Pressable onPress={onClose} style={styles.back} accessibilityRole="button">
        <Text style={styles.backText}>← Back to recipe</Text>
      </Pressable>
      {!list.length ? (
        <Text style={styles.empty}>This recipe does not have cooking steps yet.</Text>
      ) : (
        <>
          <Text style={styles.kicker}>
            Step {index + 1} of {list.length}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.card}>
            <Text style={styles.step}>{step}</Text>
          </View>
          {minutes ? (
            <View style={styles.timerRow}>
              <Pressable
                onPress={() => {
                  setRemaining(minutes * 60)
                  setRunning(true)
                }}
                style={styles.timerBtn}
              >
                <Text style={styles.timerBtnText}>{remaining == null ? `Start ${minutes}-min timer` : formatClock(remaining)}</Text>
              </Pressable>
              {running ? (
                <Pressable onPress={() => setRunning(false)} style={styles.ghostBtn}>
                  <Text style={styles.ghostText}>Pause</Text>
                </Pressable>
              ) : remaining != null && remaining > 0 ? (
                <Pressable onPress={() => setRunning(true)} style={styles.ghostBtn}>
                  <Text style={styles.ghostText}>Resume</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <View style={styles.actions}>
            <Pressable
              disabled={index === 0}
              onPress={() => setIndex((value) => value - 1)}
              style={[styles.prevBtn, index === 0 && styles.disabled]}
            >
              <Text style={styles.prevText}>Previous</Text>
            </Pressable>
            {last ? (
              <Pressable
                disabled={finishing}
                onPress={() => {
                  if (finishing) return
                  setFinishing(true)
                  onFinish()
                }}
                style={styles.nextBtn}
              >
                <Text style={styles.nextText}>Finish Cooking</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setIndex((value) => value + 1)} style={styles.nextBtn}>
                <Text style={styles.nextText}>Next</Text>
              </Pressable>
            )}
          </View>
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  back: { minHeight: 48, justifyContent: 'center', marginBottom: 8 },
  backText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  kicker: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: colors.muted,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginBottom: 20,
  },
  fill: { height: 8, backgroundColor: colors.primary, borderRadius: 999 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 28,
    padding: 24,
    minHeight: 180,
    justifyContent: 'center',
  },
  step: { fontSize: 24, lineHeight: 34, fontWeight: '600', color: colors.text },
  empty: { color: colors.muted, fontSize: 16, marginTop: 12 },
  timerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20, alignItems: 'center' },
  timerBtn: {
    minHeight: 52,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  timerBtnText: { fontSize: 16, fontWeight: '700', color: colors.text },
  ghostBtn: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 8 },
  ghostText: { fontSize: 16, fontWeight: '600', color: colors.muted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 28 },
  prevBtn: { minHeight: 56, justifyContent: 'center', paddingHorizontal: 8 },
  prevText: { fontSize: 16, fontWeight: '600', color: colors.muted },
  nextBtn: {
    flex: 1,
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  nextText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  disabled: { opacity: 0.4 },
})
