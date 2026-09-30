import { useEffect } from 'react'
import { Alert, Pressable, StyleSheet, Text } from 'react-native'
import { Screen } from '../components/Screen'
import { Card, OutlineButton } from '../components/Ui'
import { AskPantryPalView } from './AskPantryPalView'
import { expirationLabel, inventory, profile } from '../data/sample'
import { useAuth } from '../lib/AuthContext'
import { colors } from '../theme'

function comingSoon(name) {
  Alert.alert(name, 'This will be wired up in a later milestone.')
}

export function HomeScreen({ navigation, route }) {
  const { demo, signOut } = useAuth()
  const expiring = [...inventory].sort((a, b) => a.expiresInDays - b.expiresInDays).slice(0, 4)

  useEffect(() => {
    if (route?.params?.openAsk) {
      navigation.setParams?.({ openAsk: false })
    }
  }, [route?.params?.openAsk, navigation])

  return (
    <Screen title={`${profile.name}, what should we eat?`} subtitle="Ask PantryPal, or pick from what you have.">
      {demo ? <Text style={styles.demo}>Demo kitchen — sample data only, nothing is saved to the cloud.</Text> : null}

      <AskPantryPalView />

      <Card style={styles.block}>
        <Text style={styles.kicker}>Pick for Me</Text>
        <Text style={styles.body}>A realistic recipe from what you already have.</Text>
        <OutlineButton label="Pick for Me" onPress={() => comingSoon('Pick for Me')} />
      </Card>

      <Text style={styles.section}>Tonight & kitchen</Text>
      <Pressable onPress={() => navigation.navigate('Kitchen')}>
        <Text style={styles.link}>
          {expiring.length
            ? `${expiring.length} items with dates in the fridge — open Kitchen`
            : 'Open Kitchen for fridge, plan, and shopping'}
        </Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Recipes')} style={styles.scan}>
        <Text style={styles.scanText}>My recipes</Text>
      </Pressable>
      {expiring.slice(0, 2).map((item) => (
        <Text key={item.id} style={styles.rowMeta}>
          {item.name} · {expirationLabel(item.expiresInDays)}
        </Text>
      ))}

      <Pressable style={styles.signOut} onPress={() => signOut()}>
        <Text style={styles.signOutText}>{demo ? 'Exit demo' : 'Sign out'}</Text>
      </Pressable>
    </Screen>
  )
}

const styles = StyleSheet.create({
  block: { marginBottom: 12, gap: 10 },
  kicker: { fontSize: 16, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, color: colors.muted, marginBottom: 4 },
  section: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.muted,
    textTransform: 'uppercase',
  },
  link: { color: colors.primary, fontWeight: '700', marginBottom: 8 },
  rowMeta: { color: colors.urgent, fontWeight: '600', marginBottom: 4 },
  demo: { marginTop: -8, marginBottom: 16, fontSize: 13, color: colors.muted },
  scan: { marginTop: 8, minHeight: 44, justifyContent: 'center' },
  scanText: { color: colors.primary, fontWeight: '700' },
  signOut: { marginTop: 24, minHeight: 44, justifyContent: 'center' },
  signOutText: { color: colors.muted, fontWeight: '600' },
})
