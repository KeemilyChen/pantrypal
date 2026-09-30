import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useState } from 'react'
import { HomeScreen } from './src/screens/HomeScreen'
import { KitchenScreen } from './src/screens/KitchenScreen'
import { ExploreScreen } from './src/screens/ExploreScreen'
import { RecipesScreen } from './src/screens/RecipesScreen'
import { ProfileScreen } from './src/screens/ProfileScreen'
import { LoginScreen } from './src/screens/LoginScreen'
import { AskPantryPalView } from './src/screens/AskPantryPalView'
import { AuthProvider, useAuth } from './src/lib/AuthContext'
import { colors } from './src/theme'

const Tab = createBottomTabNavigator()

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.cream,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
}

const icons = {
  Home: 'home-outline',
  Kitchen: 'snow-outline',
  Explore: 'compass-outline',
  Me: 'person-outline',
  Recipes: 'restaurant-outline',
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 88,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', paddingBottom: 8 },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={icons[route.name] || 'ellipse-outline'} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Kitchen" component={KitchenScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Me" component={ProfileScreen} />
      <Tab.Screen
        name="Recipes"
        component={RecipesScreen}
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
    </Tab.Navigator>
  )
}

function Root() {
  const { ready, isSignedIn } = useAuth()
  const [askOpen, setAskOpen] = useState(false)

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (!isSignedIn) {
    return (
      <>
        <StatusBar style="dark" />
        <LoginScreen />
      </>
    )
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="dark" />
      <View style={styles.shell}>
        <MainTabs />
        <Pressable
          accessibilityLabel="Ask PantryPal"
          onPress={() => setAskOpen(true)}
          style={styles.fab}
        >
          <Ionicons name="restaurant-outline" size={26} color="#fff" />
        </Pressable>
        <Modal visible={askOpen} animationType="slide" onRequestClose={() => setAskOpen(false)}>
          <View style={styles.modal}>
            <Pressable onPress={() => setAskOpen(false)} style={styles.close}>
              <Ionicons name="close" size={28} color={colors.text} />
            </Pressable>
            <ScrollView keyboardShouldPersistTaps="handled">
              <AskPantryPalView />
            </ScrollView>
          </View>
        </Modal>
      </View>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  shell: { flex: 1 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  modal: { flex: 1, backgroundColor: colors.cream, paddingTop: 56, paddingHorizontal: 20 },
  close: { minHeight: 44, justifyContent: 'center', marginBottom: 8 },
})
