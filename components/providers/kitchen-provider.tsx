"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { formatISO, startOfToday } from "date-fns"
import { createSeedState, DEMO_USER_ID_VALUE } from "@/lib/data/seed"
import { SYSTEM_RECIPES } from "@/lib/data/system-recipes"
import { consumeIngredients } from "@/lib/inventory/consumption"
import { matchRecipeIngredients } from "@/lib/recipes/ingredient-matching"
import type {
  FoodCategory,
  InventoryItem,
  InventoryWrite,
  KitchenState,
  MealType,
  Recipe,
  RecipeWrite,
  ShoppingSource,
  StorageLocation,
} from "@/lib/types"

const STORAGE_KEY = "pantrypal-kitchen-v1"

type KitchenContextValue = KitchenState & {
  ready: boolean
  allRecipes: Recipe[]
  addInventoryItem: (input: InventoryWrite) => void
  updateInventoryItem: (id: string, patch: Partial<InventoryItem>) => void
  removeInventoryItem: (id: string) => void
  addRecipe: (input: RecipeWrite) => Recipe
  addMealPlan: (date: string, mealType: MealType, recipeId: string) => void
  removeMealPlan: (id: string) => void
  addShoppingItem: (input: {
    name: string
    quantity?: number | null
    unit?: string | null
    category?: FoodCategory
    source?: ShoppingSource
  }) => void
  toggleShoppingItem: (id: string) => void
  removeShoppingItem: (id: string) => void
  addMissingToShopping: (recipe: Recipe) => number
  consumeRecipe: (recipe: Recipe) => void
  resetDemo: () => void
}

const KitchenContext = createContext<KitchenContextValue | null>(null)

function persist(state: KitchenState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function KitchenProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<KitchenState>(createSeedState)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        setState(JSON.parse(raw) as KitchenState)
      } catch {
        persist(createSeedState())
      }
    } else {
      persist(createSeedState())
    }
    setReady(true)
  }, [])

  const commit = useCallback((updater: (prev: KitchenState) => KitchenState) => {
    setState((prev) => {
      const next = updater(prev)
      persist(next)
      return next
    })
  }, [])

  const addInventoryItem = useCallback(
    (input: InventoryWrite) => {
      const timestamp = new Date().toISOString()
      const item: InventoryItem = {
        id: crypto.randomUUID(),
        userId: DEMO_USER_ID_VALUE,
        status: input.status ?? "available",
        source: input.source ?? "manual",
        createdAt: timestamp,
        updatedAt: timestamp,
        ...input,
      }
      commit((prev) => ({ ...prev, inventory: [item, ...prev.inventory] }))
    },
    [commit],
  )

  const updateInventoryItem = useCallback(
    (id: string, patch: Partial<InventoryItem>) => {
      commit((prev) => ({
        ...prev,
        inventory: prev.inventory.map((item) =>
          item.id === id
            ? { ...item, ...patch, updatedAt: new Date().toISOString() }
            : item,
        ),
      }))
    },
    [commit],
  )

  const removeInventoryItem = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        inventory: prev.inventory.filter((item) => item.id !== id),
      }))
    },
    [commit],
  )

  const addRecipe = useCallback(
    (input: RecipeWrite) => {
      const id = crypto.randomUUID()
      const recipe: Recipe = {
        id,
        userId: DEMO_USER_ID_VALUE,
        source: "user",
        createdAt: new Date().toISOString(),
        ...input,
        ingredients: input.ingredients.map((ingredient) => ({
          ...ingredient,
          id: crypto.randomUUID(),
          recipeId: id,
        })),
      }
      commit((prev) => ({ ...prev, recipes: [recipe, ...prev.recipes] }))
      return recipe
    },
    [commit],
  )

  const addMealPlan = useCallback(
    (date: string, mealType: MealType, recipeId: string) => {
      commit((prev) => ({
        ...prev,
        mealPlans: [
          ...prev.mealPlans.filter(
            (plan) => !(plan.date === date && plan.mealType === mealType),
          ),
          {
            id: crypto.randomUUID(),
            userId: DEMO_USER_ID_VALUE,
            date,
            mealType,
            recipeId,
            status: "planned",
          },
        ],
      }))
    },
    [commit],
  )

  const removeMealPlan = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        mealPlans: prev.mealPlans.filter((plan) => plan.id !== id),
      }))
    },
    [commit],
  )

  const addShoppingItem = useCallback(
    (input: {
      name: string
      quantity?: number | null
      unit?: string | null
      category?: FoodCategory
      source?: ShoppingSource
    }) => {
      commit((prev) => {
        const exists = prev.shoppingList.some(
          (item) =>
            !item.checked && item.name.toLowerCase() === input.name.toLowerCase(),
        )
        if (exists) return prev
        return {
          ...prev,
          shoppingList: [
            {
              id: crypto.randomUUID(),
              userId: DEMO_USER_ID_VALUE,
              name: input.name,
              quantity: input.quantity ?? null,
              unit: input.unit ?? null,
              category: input.category ?? "other",
              checked: false,
              source: input.source ?? "manual",
              createdAt: new Date().toISOString(),
            },
            ...prev.shoppingList,
          ],
        }
      })
    },
    [commit],
  )

  const toggleShoppingItem = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        shoppingList: prev.shoppingList.map((item) =>
          item.id === id ? { ...item, checked: !item.checked } : item,
        ),
      }))
    },
    [commit],
  )

  const removeShoppingItem = useCallback(
    (id: string) => {
      commit((prev) => ({
        ...prev,
        shoppingList: prev.shoppingList.filter((item) => item.id !== id),
      }))
    },
    [commit],
  )

  const allRecipes = useMemo(
    () => [...state.recipes, ...SYSTEM_RECIPES],
    [state.recipes],
  )

  const addMissingToShopping = useCallback(
    (recipe: Recipe) => {
      const names = recipe.ingredients
        .filter((ingredient) => !ingredient.optional)
        .map((ingredient) => ingredient.ingredientName)
      const { missing } = matchRecipeIngredients(state.inventory, names)
      missing.forEach((name) => {
        const ingredient = recipe.ingredients.find((item) => item.ingredientName === name)
        addShoppingItem({
          name,
          quantity: ingredient?.quantity ?? null,
          unit: ingredient?.unit ?? null,
          category: "other",
          source: "meal_plan",
        })
      })
      return missing.length
    },
    [addShoppingItem, state.inventory],
  )

  const consumeRecipe = useCallback(
    (recipe: Recipe) => {
      commit((prev) => ({
        ...prev,
        inventory: consumeIngredients(prev.inventory, recipe.ingredients),
      }))
    },
    [commit],
  )

  const resetDemo = useCallback(() => {
    const next = createSeedState()
    persist(next)
    setState(next)
  }, [])

  const value = useMemo<KitchenContextValue>(
    () => ({
      ...state,
      ready,
      allRecipes,
      addInventoryItem,
      updateInventoryItem,
      removeInventoryItem,
      addRecipe,
      addMealPlan,
      removeMealPlan,
      addShoppingItem,
      toggleShoppingItem,
      removeShoppingItem,
      addMissingToShopping,
      consumeRecipe,
      resetDemo,
    }),
    [
      state,
      ready,
      allRecipes,
      addInventoryItem,
      updateInventoryItem,
      removeInventoryItem,
      addRecipe,
      addMealPlan,
      removeMealPlan,
      addShoppingItem,
      toggleShoppingItem,
      removeShoppingItem,
      addMissingToShopping,
      consumeRecipe,
      resetDemo,
    ],
  )

  return <KitchenContext.Provider value={value}>{children}</KitchenContext.Provider>
}

export function useKitchen() {
  const value = useContext(KitchenContext)
  if (!value) throw new Error("useKitchen must be used within KitchenProvider")
  return value
}

export function todayISO() {
  return formatISO(startOfToday(), { representation: "date" })
}

export function guessCategory(name: string): FoodCategory {
  const value = name.toLowerCase()
  if (/chicken|beef|pork|turkey/.test(value)) return "meat"
  if (/fish|salmon|shrimp/.test(value)) return "seafood"
  if (/milk|cheese|yogurt|egg|butter/.test(value)) return "dairy"
  if (/spinach|broccoli|carrot|apple|berry|onion|garlic|tomato/.test(value)) return "produce"
  if (/rice|pasta|bread|oat/.test(value)) return "grains"
  if (/soda|juice|water/.test(value)) return "beverages"
  if (/dumpling|frozen/.test(value)) return "frozen"
  if (/oil|sauce|salt|spice/.test(value)) return "pantry"
  return "other"
}

export function guessLocation(category: FoodCategory): StorageLocation {
  if (category === "frozen") return "freezer"
  if (category === "grains" || category === "pantry") return "pantry"
  return "fridge"
}
