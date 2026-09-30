import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Screen } from '../components/Screen'
import { Card } from '../components/Ui'
import { fetchMyProfile, fetchCommunityRecipe, fetchMealPlan } from '../lib/community'
import { useAuth } from '../lib/AuthContext'
import { colors } from '../theme'

export function ProfileScreen({ navigation }) {
  const { demo, session } = useAuth()
  const accessToken = session?.access_token
  const [tab, setTab] = useState('posts')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    if (demo || !accessToken) return
    void fetchMyProfile({ accessToken })
      .then(setData)
      .catch((loadError) => setError(loadError.message))
  }, [accessToken, demo])

  if (demo || !accessToken) {
    return (
      <Screen title="Me" subtitle="Your posts, saves, and likes.">
        <Text style={styles.meta}>Sign in to keep a public kitchen profile. Demo stays private on this phone.</Text>
      </Screen>
    )
  }

  if (detail) {
    return (
      <Screen title={detail.name || detail.title} subtitle={detail.description || ''}>
        <Pressable onPress={() => setDetail(null)} style={styles.back}>
          <Text style={styles.backText}>← Back to profile</Text>
        </Pressable>
        <Text style={styles.meta}>{JSON.stringify(detail.instructions ? 'Recipe' : 'Meal plan')}</Text>
      </Screen>
    )
  }

  const items = data?.[tab] || []

  return (
    <Screen title="Me" subtitle={`${data?.profile?.name || 'Your kitchen'} · ${data?.profile?.postCount || 0} public posts`}>
      <Pressable onPress={() => navigation.navigate('Recipes')} style={styles.back}>
        <Text style={styles.backText}>My recipes</Text>
      </Pressable>
      <View style={styles.tabs}>
        {['posts', 'saved', 'liked'].map((item) => (
          <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.tabOn]}>
            <Text style={[styles.tabText, tab === item && styles.tabTextOn]}>{item[0].toUpperCase() + item.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {tab === 'posts' && !items.length ? (
        <Text style={styles.meta}>No posts yet. Ask PantryPal for a recipe or share a meal plan from Plan.</Text>
      ) : null}
      {items.map((item) => (
        <Pressable
          key={`${item.contentType}-${item.id}`}
          onPress={() => {
            void (item.contentType === 'meal_plan'
              ? fetchMealPlan({ accessToken, id: item.id })
              : fetchCommunityRecipe({ accessToken, id: item.id })
            ).then(setDetail)
          }}
        >
          <Card style={styles.card}>
            <Text style={styles.kicker}>{item.contentType === 'meal_plan' ? 'Meal plan' : 'Recipe'}</Text>
            <Text style={styles.name}>{item.name}</Text>
            {item.description ? <Text style={styles.meta}>{item.description}</Text> : null}
          </Card>
        </Pressable>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.primarySoft },
  tabOn: { backgroundColor: colors.primary },
  tabText: { color: colors.primary, fontWeight: '700' },
  tabTextOn: { color: '#fff' },
  card: { marginBottom: 10 },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  kicker: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  meta: { color: colors.muted, marginTop: 8 },
  error: { color: colors.urgent, fontWeight: '600' },
  back: { minHeight: 44, justifyContent: 'center' },
  backText: { color: colors.primary, fontWeight: '700' },
})
