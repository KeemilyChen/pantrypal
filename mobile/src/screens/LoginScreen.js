import { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Screen } from '../components/Screen'
import { Card, OutlineButton, PrimaryButton } from '../components/Ui'
import { useAuth } from '../lib/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { colors } from '../theme'

function authErrorMessage(error) {
  const code = error?.code ?? ''
  const message = (error?.message ?? '').toLowerCase()

  if (code === 'invalid_credentials' || message.includes('invalid login')) {
    return 'That email or password is incorrect.'
  }
  if (code === 'user_already_exists' || message.includes('already registered')) {
    return 'An account with that email already exists. Sign in instead.'
  }
  if (
    code === 'email_address_invalid' ||
    message.includes('invalid email') ||
    message.includes('unable to validate email')
  ) {
    return 'Please enter a valid email address.'
  }
  if (
    code === 'weak_password' ||
    message.includes('password should be') ||
    message.includes('password is too') ||
    (message.includes('password') &&
      (message.includes('least') || message.includes('characters') || message.includes('weak')))
  ) {
    return 'Password is too short. Use at least 6 characters.'
  }
  if (code === 'email_not_confirmed' || message.includes('not confirmed')) {
    return 'Check your email to confirm your account, then sign in.'
  }

  return error?.message || 'Something went wrong. Please try again.'
}

export function LoginScreen() {
  const { enterDemo } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit() {
    if (!isSupabaseConfigured || !supabase) {
      Alert.alert('Sign in unavailable', 'Mobile cloud sign-in is not configured yet.')
      return
    }

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      Alert.alert('Missing details', 'Enter an email and password.')
      return
    }

    setBusy(true)

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })
      setBusy(false)
      if (error) {
        Alert.alert('Could not sign in', authErrorMessage(error))
      }
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    })
    setBusy(false)
    if (error) {
      Alert.alert('Could not create account', authErrorMessage(error))
      return
    }

    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      Alert.alert('Account already exists', 'An account with that email already exists. Sign in instead.')
      setMode('signin')
      return
    }

    if (data.session) return

    Alert.alert(
      'Check your email',
      'Confirm your account from the email we sent, then sign in.',
    )
    setMode('signin')
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen title="PantryPal" subtitle="What should we do with the food you have?">
        <View style={styles.tabs}>
          <Pressable
            onPress={() => setMode('signin')}
            style={[styles.tab, mode === 'signin' && styles.tabActive]}
          >
            <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>Sign in</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('signup')}
            style={[styles.tab, mode === 'signup' && styles.tabActive]}
          >
            <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>Create account</Text>
          </Pressable>
        </View>

        <Card style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            autoCapitalize="none"
            placeholder="At least 6 characters"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
          <PrimaryButton
            disabled={busy}
            label={
              busy
                ? 'Please wait…'
                : mode === 'signin'
                  ? 'Sign in'
                  : 'Create account'
            }
            onPress={onSubmit}
          />
        </Card>

        <OutlineButton
          disabled={busy}
          label="Continue with demo kitchen"
          onPress={() => enterDemo()}
        />
        <Text style={styles.hint}>
          Demo stays on this phone only. It does not create a cloud account.
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  tabActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  tabText: { fontWeight: '600', color: colors.muted },
  tabTextActive: { color: colors.primary },
  card: { gap: 10, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: colors.cream,
    color: colors.text,
    fontSize: 16,
  },
  hint: { marginTop: 12, textAlign: 'center', color: colors.muted, fontSize: 13 },
})
