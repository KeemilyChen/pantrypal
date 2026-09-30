import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme'

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function PrimaryButton({ label, onPress, disabled }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.primary, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  )
}

export function OutlineButton({ label, onPress, disabled }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.outline, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={styles.outlineText}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
  },
  primary: {
    backgroundColor: colors.primary,
    minHeight: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  outline: {
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.card,
    minHeight: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  outlineText: { color: colors.text, fontWeight: '600', fontSize: 15 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.55 },
})
