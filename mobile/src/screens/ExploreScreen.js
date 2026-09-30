import { useEffect, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Screen } from '../components/Screen'
import { Card, OutlineButton, PrimaryButton } from '../components/Ui'
import { CookingModeView } from './CookingModeView'
import { asInstructionSteps } from '../lib/stepTimer'
import {
  addCommunityTag,
  addRecipeToPlan,
  fetchCommunityRecipe,
  fetchExplore,
  fetchMealPlan,
  fetchPublicProfile,
  importMealPlan,
  recordOpen,
  toggleLike,
  toggleSave,
} from '../lib/community'
import { useAuth } from '../lib/AuthContext'
import { colors } from '../theme'

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack']

function today() {
  return new Date().toISOString().slice(0, 10)
}

function nutritionLine(item) {
  const calories = item.calories ?? item.avgCalories
  const protein = item.proteinG ?? item.avgProtein
  if (calories == null && protein == null) return null
  const parts = [calories != null ? `${Math.round(calories)} kcal` : null, protein != null ? `${Math.round(protein)}g protein` : null].filter(Boolean)
  return `Estimated nutrition — ${parts.join(' · ')}`
}

export function ExploreScreen() {
  const { demo, session } = useAuth()
  const accessToken = session?.access_token
  const [search, setSearch] = useState('')
  const [tag, setTag] = useState('')
  const [type, setType] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [plan, setPlan] = useState(null)
  const [profile, setProfile] = useState(null)
  const [tagDraft, setTagDraft] = useState('')
  const [slotDate, setSlotDate] = useState(today())
  const [slotMeal, setSlotMeal] = useState('dinner')
  const [startDate, setStartDate] = useState(today())
  const [cooking, setCooking] = useState(false)

  async function load(nextType = type, nextTag = tag) {
    if (demo || !accessToken) return
    setLoading(true)
    setError('')
    try {
      const data = await fetchExplore({ accessToken, search, tag: nextTag, mode: 'foryou', type: nextType })
      setItems(data.items || data.recipes || [])
    } catch (loadError) {
      setItems([])
      setError(loadError instanceof Error ? loadError.message : 'Could not load Explore.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, demo])

  async function openRecipe(id) {
    try {
      const recipe = await fetchCommunityRecipe({ accessToken, id })
      setSelected(recipe)
      setPlan(null)
      setProfile(null)
      setCooking(false)
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Could not open that recipe.')
    }
  }

  async function openPlan(id) {
    try {
      const mealPlan = await fetchMealPlan({ accessToken, id })
      setPlan(mealPlan)
      setSelected(null)
      setProfile(null)
      setCooking(false)
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Could not open that meal plan.')
    }
  }

  if (demo || !accessToken) {
    return (
      <Screen title="Explore" subtitle="Community recipes and meal plans.">
        <Text style={styles.meta}>Sign in to browse Explore. Demo kitchens stay on this phone only.</Text>
      </Screen>
    )
  }

  if (profile) {
    return (
      <Screen title={profile.profile?.name || 'Profile'} subtitle={`${profile.profile?.postCount || 0} public posts`}>
        <Pressable onPress={() => setProfile(null)} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        {(profile.posts || []).map((item) => (
          <Pressable
            key={`${item.contentType}-${item.id}`}
            onPress={() => (item.contentType === 'meal_plan' ? openPlan(item.id) : openRecipe(item.id))}
          >
            <Card style={styles.card}>
              <Text style={styles.kicker}>{item.contentType === 'meal_plan' ? 'Meal plan' : 'Recipe'}</Text>
              <Text style={styles.name}>{item.name}</Text>
            </Card>
          </Pressable>
        ))}
        {!profile.posts?.length ? <Text style={styles.meta}>This kitchen has not posted yet.</Text> : null}
      </Screen>
    )
  }

  if (plan) {
    return (
      <Screen title={plan.title} subtitle={plan.description || ''}>
        <Pressable onPress={() => setPlan(null)} style={styles.back}>
          <Text style={styles.backText}>← Back to Explore</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            void fetchPublicProfile({ accessToken, id: plan.userId }).then(setProfile)
          }}
        >
          <Text style={styles.creator}>{plan.creatorName}</Text>
        </Pressable>
        <Text style={styles.meta}>
          {plan.mealCount} meals · {plan.dayCount} days
        </Text>
        {nutritionLine(plan) ? <Text style={styles.meta}>{nutritionLine(plan)}</Text> : null}
        <View style={styles.row}>
          <OutlineButton
            label={plan.liked ? 'Liked' : 'Like'}
            onPress={() =>
              void toggleLike({ accessToken, id: plan.id, targetType: 'meal_plan' }).then(() => openPlan(plan.id))
            }
          />
          <OutlineButton
            label={plan.saved ? 'Saved' : 'Save'}
            onPress={() =>
              void toggleSave({ accessToken, id: plan.id, targetType: 'meal_plan' }).then(() => openPlan(plan.id))
            }
          />
        </View>
        <TextInput value={startDate} onChangeText={setStartDate} placeholder="Start date YYYY-MM-DD" placeholderTextColor={colors.muted} style={styles.input} />
        <PrimaryButton
          label="Import Meal Plan (skip filled)"
          onPress={() => {
            void importMealPlan({ accessToken, id: plan.id, startDate, onConflict: 'skip' })
              .then((result) => setError(`Imported ${result.imported || 0}, skipped ${result.skipped || 0}.`))
              .catch((importError) => setError(importError.message))
          }}
        />
        <View style={{ height: 8 }} />
        <OutlineButton
          label="Import and replace"
          onPress={() => {
            void importMealPlan({ accessToken, id: plan.id, startDate, onConflict: 'replace' })
              .then((result) => setError(`Imported ${result.imported || 0}.`))
              .catch((importError) => setError(importError.message))
          }}
        />
        {(plan.meals || []).map((meal) => (
          <Pressable key={`${meal.dayOffset}-${meal.mealType}-${meal.recipeId}`} onPress={() => void openRecipe(meal.recipeId)}>
            <Card style={styles.card}>
              <Text style={styles.kicker}>
                Day {meal.dayOffset + 1} · {meal.mealType}
              </Text>
              <Text style={styles.name}>{meal.name}</Text>
            </Card>
          </Pressable>
        ))}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Screen>
    )
  }

  if (selected) {
    return (
      <Screen title={selected.name} subtitle={selected.description || ''}>
        <Pressable
          onPress={() => {
            setCooking(false)
            setSelected(null)
          }}
          style={styles.back}
        >
          <Text style={styles.backText}>← Back to Explore</Text>
        </Pressable>
        {selected.creatorId ? (
          <Pressable onPress={() => void fetchPublicProfile({ accessToken, id: selected.creatorId }).then(setProfile)}>
            <Text style={styles.creator}>{selected.creatorName}</Text>
          </Pressable>
        ) : null}
        <Text style={styles.time}>{(selected.prepTime || 0) + (selected.cookTime || 0)} min</Text>
        {nutritionLine(selected) ? <Text style={styles.meta}>{nutritionLine(selected)}</Text> : null}
        {selected.needCount ? (
          <Text style={styles.meta}>
            Fridge {selected.haveCount}/{selected.needCount}
            {selected.missing?.length ? ` · missing ${selected.missing.join(', ')}` : ''}
          </Text>
        ) : null}
        <View style={styles.chips}>
          {(selected.tags || []).map((item) => (
            <Pressable
              key={item.slug || item.name}
              onPress={() => {
                setTag(item.slug || item.name)
                setSelected(null)
                void load(type, item.slug || item.name)
              }}
            >
              <Text style={styles.chip}>{item.name}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          <OutlineButton
            label={selected.liked ? 'Liked' : 'Like'}
            onPress={() => void toggleLike({ accessToken, id: selected.id }).then(() => openRecipe(selected.id))}
          />
          <OutlineButton
            label={selected.saved ? 'Saved' : 'Save'}
            onPress={() => void toggleSave({ accessToken, id: selected.id }).then(() => openRecipe(selected.id))}
          />
        </View>
        <PrimaryButton
          label="Start Cooking"
          onPress={() => setCooking(true)}
        />
        <Modal visible={cooking} animationType="slide" onRequestClose={() => setCooking(false)}>
          <CookingModeView
            recipeName={selected.name}
            steps={asInstructionSteps(selected.instructions)}
            onClose={() => setCooking(false)}
            onFinish={() => {
              void recordOpen({ accessToken, id: selected.id, kind: 'cook' })
              setCooking(false)
            }}
          />
        </Modal>
        <Text style={styles.section}>Add to Meal Plan</Text>
        <TextInput value={slotDate} onChangeText={setSlotDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={styles.input} />
        <View style={styles.chips}>
          {MEALS.map((meal) => (
            <Pressable key={meal} onPress={() => setSlotMeal(meal)}>
              <Text style={[styles.chip, slotMeal === meal && styles.chipOn]}>{meal}</Text>
            </Pressable>
          ))}
        </View>
        <PrimaryButton
          label="Add (skip if filled)"
          onPress={() => {
            void addRecipeToPlan({ accessToken, id: selected.id, date: slotDate, mealType: slotMeal, onConflict: 'skip' }).then(
              (result) => {
                if (result.conflict) setError('That slot is filled. Use replace if you want to overwrite it.')
                else setError('Added to your meal plan.')
              },
            )
          }}
        />
        <View style={{ height: 8 }} />
        <OutlineButton
          label="Replace slot"
          onPress={() => {
            void addRecipeToPlan({
              accessToken,
              id: selected.id,
              date: slotDate,
              mealType: slotMeal,
              onConflict: 'replace',
            }).then(() => setError('Replaced that slot.'))
          }}
        />
        {selected.isOwner ? (
          <View style={styles.addRow}>
            <TextInput
              value={tagDraft}
              onChangeText={setTagDraft}
              placeholder="Add a tag the AI missed"
              placeholderTextColor={colors.muted}
              style={styles.smallInput}
            />
            <PrimaryButton
              label="Add"
              onPress={() => {
                void (async () => {
                  await addCommunityTag({ accessToken, recipeId: selected.id, name: tagDraft })
                  setTagDraft('')
                  await openRecipe(selected.id)
                })()
              }}
            />
          </View>
        ) : null}
        <Text style={styles.section}>Ingredients</Text>
        {(selected.ingredients || []).map((item) => (
          <Text key={item.id || item.ingredientName} style={styles.meta}>
            {[item.quantity, item.unit, item.ingredientName].filter(Boolean).join(' ')}
          </Text>
        ))}
        <Text style={styles.section}>Instructions</Text>
        {(selected.instructions || []).map((step, index) => (
          <Text key={`${index}-${step}`} style={styles.meta}>
            {index + 1}. {step}
          </Text>
        ))}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Screen>
    )
  }

  return (
    <Screen title="Explore" subtitle="Personalized recipes and meal plans from other kitchens.">
      <View style={styles.chips}>
        {[
          ['all', 'All'],
          ['recipe', 'Recipes'],
          ['meal_plan', 'Meal Plans'],
        ].map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => {
              setType(id)
              void load(id)
            }}
          >
            <Text style={[styles.chip, type === id && styles.chipOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search names or tags" placeholderTextColor={colors.muted} style={styles.input} />
      <TextInput value={tag} onChangeText={setTag} placeholder="Filter by a tag" placeholderTextColor={colors.muted} style={styles.input} />
      <PrimaryButton disabled={loading} label={loading ? 'Loading…' : 'Search'} onPress={() => void load()} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} /> : null}
      {!loading && !items.length ? <Text style={styles.meta}>Nothing public matches that search yet.</Text> : null}
      {items.map((item) => (
        <Pressable
          key={`${item.contentType}-${item.id}`}
          onPress={() => (item.contentType === 'meal_plan' ? openPlan(item.id) : openRecipe(item.id))}
        >
          <Card style={styles.card}>
            <Text style={styles.kicker}>{item.contentType === 'meal_plan' ? 'Meal plan' : 'Recipe'}</Text>
            <Text style={styles.name}>{item.name}</Text>
            {item.creatorName ? <Text style={styles.creator}>{item.creatorName}</Text> : null}
            {item.description ? <Text style={styles.meta}>{item.description}</Text> : null}
            <Text style={styles.meta}>
              {item.contentType === 'meal_plan'
                ? `${item.mealCount || 0} meals · ${item.dayCount || 0} days`
                : `${(item.prepTime || 0) + (item.cookTime || 0)} min`}
              {item.needCount ? ` · fridge ${item.haveCount}/${item.needCount}` : ''}
            </Text>
            {nutritionLine(item) ? <Text style={styles.meta}>{nutritionLine(item)}</Text> : null}
            <View style={styles.chips}>
              {(item.tags || []).map((tagItem) => (
                <Text key={tagItem.slug || tagItem.name} style={styles.chip}>
                  {tagItem.name}
                </Text>
              ))}
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    color: colors.text,
    marginBottom: 10,
  },
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
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginVertical: 12 },
  row: { flexDirection: 'row', gap: 8, marginVertical: 10 },
  card: { marginTop: 12, gap: 6 },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  kicker: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  creator: { color: colors.primary, fontWeight: '700', marginTop: 4 },
  meta: { color: colors.muted, marginTop: 8 },
  error: { color: colors.urgent, fontWeight: '600', marginTop: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 8 },
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
  chipOn: { backgroundColor: colors.primary, color: '#fff' },
  back: { minHeight: 44, justifyContent: 'center', marginBottom: 8 },
  backText: { color: colors.primary, fontWeight: '700' },
  time: { color: colors.primary, fontWeight: '700', marginBottom: 12 },
  section: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.muted,
    textTransform: 'uppercase',
  },
})
