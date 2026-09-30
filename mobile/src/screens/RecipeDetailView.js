import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Screen } from '../components/Screen'
import { Card, PrimaryButton } from '../components/Ui'
import { matchRecipeIngredients, ownershipNotes } from '../lib/ingredientMatch'
import { publishRecipe } from '../lib/community'
import { dedupeTags, slugifyTag } from '../lib/tags'
import { colors } from '../theme'

function requiredNames(recipe) {
  return (recipe.ingredients || [])
    .filter((item) => !item.optional)
    .map((item) => item.name || item.ingredientName)
    .filter(Boolean)
}

export function RecipeDetailView({ recipe, inventory, onBack, accessToken, demo }) {
  const required = requiredNames(recipe)
  const optional = (recipe.ingredients || []).filter((item) => item.optional)
  const { using, missing } = matchRecipeIngredients(inventory, required)
  const minutes = recipe.estimatedMinutes || (recipe.prepTime || 0) + (recipe.cookTime || 0)
  const notes = ownershipNotes(using, missing, minutes)
  const [extraTags, setExtraTags] = useState([])
  const [draft, setDraft] = useState('')
  const [posted, setPosted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const tags = dedupeTags([...(recipe.tags || []), ...extraTags])

  return (
    <Screen title={recipe.name} subtitle={recipe.description || ''}>
      <Pressable onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>← Back to recommendations</Text>
      </Pressable>
      <Text style={styles.time}>{minutes} min</Text>
      {(recipe.calories != null || recipe.proteinG != null) ? (
        <Text style={styles.why}>
          Estimated nutrition — {[
            recipe.calories != null ? `${Math.round(recipe.calories)} kcal` : null,
            recipe.proteinG != null ? `${Math.round(recipe.proteinG)}g protein` : null,
          ].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
      <Card style={styles.block}>
        {notes.map((line) => (
          <Text key={line} style={styles.why}>
            • {line}
          </Text>
        ))}
      </Card>

      <Text style={styles.section}>Tags</Text>
      <View style={styles.chips}>
        {tags.map((tag) => (
          <Text key={tag.slug} style={styles.chip}>
            {tag.name}
          </Text>
        ))}
      </View>
      <View style={styles.addRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a tag the AI missed"
          placeholderTextColor={colors.muted}
          style={styles.smallInput}
        />
        <PrimaryButton
          label="Add"
          onPress={() => {
            const slug = slugifyTag(draft)
            if (!slug) return
            setExtraTags((current) => dedupeTags([...current, { name: draft.trim(), kind: 'other', source: 'user' }]))
            setDraft('')
          }}
        />
      </View>
      {demo ? (
        <Text style={styles.empty}>Demo kitchens cannot post to Explore.</Text>
      ) : posted ? (
        <Text style={styles.have}>Posted to Explore.</Text>
      ) : (
        <PrimaryButton
          disabled={busy || !accessToken}
          label={busy ? 'Posting…' : 'Post to Explore'}
          onPress={() => {
            void (async () => {
              setBusy(true)
              setError('')
              try {
                await publishRecipe({ accessToken, recipe, extraTags })
                setPosted(true)
              } catch (publishError) {
                setError(publishError instanceof Error ? publishError.message : 'Could not post to Explore.')
              } finally {
                setBusy(false)
              }
            })()
          }}
        />
      )}
      {error ? <Text style={styles.miss}>{error}</Text> : null}

      <Text style={styles.section}>What I have</Text>
      {using.length ? (
        using.map((name) => (
          <Text key={name} style={styles.have}>
            {name}
          </Text>
        ))
      ) : (
        <Text style={styles.empty}>None of the required ingredients are in your fridge yet.</Text>
      )}

      <Text style={styles.section}>What I am missing</Text>
      {missing.length ? (
        missing.map((name) => (
          <Text key={name} style={styles.miss}>
            {name}
          </Text>
        ))
      ) : (
        <Text style={styles.empty}>You have the required ingredients.</Text>
      )}

      {optional.length ? (
        <>
          <Text style={styles.section}>Optional</Text>
          {optional.map((item) => (
            <Text key={item.name || item.ingredientName} style={styles.meta}>
              {item.name || item.ingredientName}
            </Text>
          ))}
        </>
      ) : null}

      <Text style={styles.section}>Ingredients</Text>
      {(recipe.ingredients || []).map((item) => {
        const name = item.name || item.ingredientName
        const qty = item.quantity != null ? String(item.quantity) : ''
        const unit = item.unit || ''
        return (
          <Text key={name} style={styles.meta}>
            {[qty, unit, name].filter(Boolean).join(' ')}
            {item.optional ? ' (optional)' : ''}
          </Text>
        )
      })}

      <Text style={styles.section}>Instructions</Text>
      {(recipe.instructions || []).map((step, index) => (
        <View key={`${index}-${step}`} style={styles.step}>
          <Text style={styles.stepNum}>{index + 1}</Text>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  back: { minHeight: 44, justifyContent: 'center', marginBottom: 8 },
  backText: { color: colors.primary, fontWeight: '700' },
  time: { color: colors.primary, fontWeight: '700', marginBottom: 12 },
  block: { marginBottom: 12, gap: 4 },
  why: { color: colors.muted, fontSize: 13 },
  section: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.muted,
    textTransform: 'uppercase',
  },
  have: { color: colors.ok, fontWeight: '600', marginBottom: 4 },
  miss: { color: colors.urgent, fontWeight: '600', marginBottom: 4 },
  empty: { color: colors.muted, marginBottom: 4 },
  meta: { color: colors.text, marginBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: {
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
  smallInput: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    color: colors.text,
  },
  step: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    fontWeight: '700',
    textAlign: 'center',
    overflow: 'hidden',
    lineHeight: 24,
  },
  stepText: { flex: 1, color: colors.text, lineHeight: 20 },
})
