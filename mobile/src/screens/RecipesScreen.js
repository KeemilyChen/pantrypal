import { StyleSheet, Text } from 'react-native'
import { Screen } from '../components/Screen'
import { PrimaryButton } from '../components/Ui'
import { colors } from '../theme'

export function RecipesScreen({ navigation }) {
  return (
    <Screen title="Recipes" subtitle="Your cookbook for cooking at home.">
      <PrimaryButton label="Ask PantryPal" onPress={() => navigation.navigate('Home', { openAsk: true })} />
      <Text style={styles.meta}>
        Saved community recipes live on Me. Ask PantryPal on Home for ideas from your fridge.
      </Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  meta: { marginTop: 16, color: colors.muted, fontSize: 14 },
})
