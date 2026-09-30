import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, spacing } from '../theme'

export function Screen({ title, subtitle, children, scroll = true, embedded = false }) {
  const body = (
    <View style={styles.inner}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  )

  const wrapped = scroll ? (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      {body}
    </ScrollView>
  ) : (
    body
  )

  if (embedded) {
    return <View style={styles.safe}>{wrapped}</View>
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {wrapped}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingBottom: 28 },
  inner: { paddingHorizontal: spacing.screen, paddingTop: 8 },
  title: { fontSize: 32, fontWeight: '700', color: colors.text },
  subtitle: { marginTop: 4, marginBottom: 16, fontSize: 14, color: colors.muted },
})
