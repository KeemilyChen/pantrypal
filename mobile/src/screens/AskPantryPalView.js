import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Card, PrimaryButton } from '../components/Ui'
import { askPantryPal } from '../lib/askPantryPal'
import { useAuth } from '../lib/AuthContext'
import { matchRecipeIngredients } from '../lib/ingredientMatch'
import { colors } from '../theme'
import { RecipeDetailView } from './RecipeDetailView'

const PLACEHOLDER = 'Something quick and spicy, or only 20 minutes…'

function requiredNames(recipe) {
  return (recipe.ingredients || [])
    .filter((item) => !item.optional)
    .map((item) => item.name || item.ingredientName)
    .filter(Boolean)
}

export function AskPantryPalView() {
  const { demo, session } = useAuth()
  const userId = session?.user?.id ?? null
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [inventory, setInventory] = useState([])
  const [selected, setSelected] = useState(null)

  async function ask() {
    setLoading(true)
    setError('')
    setSelected(null)
    try {
      const { result: next, inventory: fridge } = await askPantryPal({ query, demo, userId })
      setInventory(fridge)
      setResult(next)
    } catch (askError) {
      setResult(null)
      setError(askError instanceof Error ? askError.message : 'Could not get recommendations.')
    } finally {
      setLoading(false)
    }
  }

  if (selected) {
    return (
      <RecipeDetailView
        recipe={selected}
        inventory={inventory}
        accessToken={session?.access_token}
        demo={demo}
        onBack={() => setSelected(null)}
      />
    )
  }

  return (
    <View>
      {demo ? (
        <Text style={styles.demo}>Demo kitchen — recommendations use sample food, not a cloud fridge.</Text>
      ) : null}
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={PLACEHOLDER}
        placeholderTextColor={colors.muted}
        multiline
        style={styles.input}
      />
      <PrimaryButton
        disabled={loading || !query.trim()}
        label={loading ? 'Thinking…' : 'Ask PantryPal'}
        onPress={() => void ask()}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.status}>Checking your fridge and cooking up ideas…</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {result ? (
        <View style={styles.results}>
          <Text style={styles.summary}>{result.summary}</Text>
          {result.source === 'fallback' ? (
            <Text style={styles.meta}>Live AI is off, so this is a simple fridge-based idea.</Text>
          ) : null}
          {result.recipes.map((entry) => {
            const haveMissing = matchRecipeIngredients(inventory, requiredNames(entry))
            return (
              <Pressable key={entry.name} onPress={() => setSelected(entry)}>
                <Card style={styles.card}>
                  <Text style={styles.name}>{entry.name}</Text>
                  {entry.description ? <Text style={styles.reason}>{entry.description}</Text> : null}
                  <Text style={styles.time}>{entry.estimatedMinutes} min</Text>
                  <Text style={styles.have}>Have: {haveMissing.using.join(', ') || '—'}</Text>
                  <Text style={styles.miss}>Missing: {haveMissing.missing.join(', ') || '—'}</Text>
                  {(entry.tags || []).length ? (
                    <Text style={styles.meta}>{(entry.tags || []).map((tag) => tag.name).join(' · ')}</Text>
                  ) : null}
                </Card>
              </Pressable>
            )
          })}
        </View>
      ) : (
        !loading && (
          <Text style={styles.hint}>
            PantryPal invents recipes from your actual available food, then marks extras as missing.
          </Text>
        )
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  demo: { marginBottom: 12, color: colors.muted, fontSize: 13 },
  input: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
    backgroundColor: colors.card,
    color: colors.text,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  center: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  status: { color: colors.muted },
  error: { marginTop: 12, color: colors.urgent, fontWeight: '600' },
  results: { marginTop: 16, gap: 12 },
  summary: { fontSize: 16, fontWeight: '600', color: colors.text },
  card: { gap: 6 },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  reason: { color: colors.muted },
  time: { color: colors.primary, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13 },
  have: { color: colors.ok, fontWeight: '600' },
  miss: { color: colors.urgent, fontWeight: '600' },
  hint: { marginTop: 16, color: colors.muted },
})
