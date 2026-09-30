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
  removeRecipe: (id: string) => boolean
  addMealPlan: (
    date: string,
    mealType: MealType,
    recipeId: string,
    onConflict?: "skip" | "replace",
  ) => Promise<{ conflict: boolean }>
  removeMealPlan: (id: string) => void
  usesCloudPlan: boolean
  refreshCloudPlan: () => Promise<void>
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
  const [usesCloudPlan, setUsesCloudPlan] = useState(false)
  const [cloudPlans, setCloudPlans] = useState<KitchenState["mealPlans"]>([])
  const [cloudRecipes, setCloudRecipes] = useState<Recipe[]>([])

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

  const removeRecipe = useCallback(
    (id: string) => {
      const recipe = state.recipes.find((item) => item.id === id)
      if (!recipe || recipe.source !== "user") return false
      commit((prev) => ({
        ...prev,
        recipes: prev.recipes.filter((item) => item.id !== id),
        mealPlans: prev.mealPlans.filter((plan) => plan.recipeId !== id),
      }))
      return true
    },
    [commit, state.recipes],
  )

  const refreshCloudPlan = useCallback(async () => {
    const response = await fetch("/api/plan")
    const data = (await response.json()) as {
      needsAuth?: boolean
      slots?: Array<{
        id: string
        date: string
        mealType: MealType
        recipeId: string
        status: KitchenState["mealPlans"][number]["status"]
        recipeName?: string
        recipeDescription?: string
      }>
    }
    if (!response.ok || data.needsAuth) {
      setUsesCloudPlan(false)
      setCloudPlans([])
      setCloudRecipes([])
      return
    }
    setUsesCloudPlan(true)
    setCloudPlans(
      (data.slots ?? []).map((slot) => ({
        id: slot.id,
        userId: DEMO_USER_ID_VALUE,
        date: slot.date,
        mealType: slot.mealType,
        recipeId: slot.recipeId,
        status: slot.status ?? "planned",
        recipeName: slot.recipeName,
      })),
    )
    setCloudRecipes(
      (data.slots ?? []).map((slot) => ({
        id: slot.recipeId,
        userId: null,
        name: slot.recipeName || "Recipe",
        description: slot.recipeDescription || "",
        instructions: [],
        prepTime: 0,
        cookTime: 0,
        servings: 2,
        source: "user",
        imageUrl: null,
        createdAt: "",
        ingredients: [],
      })),
    )
  }, [])

  useEffect(() => {
    if (!ready) return
    void refreshCloudPlan()
  }, [ready, refreshCloudPlan])

  const addMealPlan = useCallback(
    async (
      date: string,
      mealType: MealType,
      recipeId: string,
      onConflict: "skip" | "replace" = "replace",
    ) => {
      if (usesCloudPlan) {
        const response = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, mealType, recipeId, onConflict }),
        })
        const data = (await response.json()) as { error?: string; conflict?: boolean }
        if (response.status === 409 || data.conflict) return { conflict: true }
        if (!response.ok) throw new Error(data.error ?? "Could not save meal.")
        await refreshCloudPlan()
        return { conflict: false }
      }
      let conflict = false
      commit((prev) => {
        const occupied = prev.mealPlans.some((plan) => plan.date === date && plan.mealType === mealType)
        if (occupied && onConflict === "skip") {
          conflict = true
          return prev
        }
        return {
          ...prev,
          mealPlans: [
            ...prev.mealPlans.filter((plan) => !(plan.date === date && plan.mealType === mealType)),
            {
              id: crypto.randomUUID(),
              userId: DEMO_USER_ID_VALUE,
              date,
              mealType,
              recipeId,
              status: "planned",
            },
          ],
        }
      })
      return { conflict }
    },
    [commit, refreshCloudPlan, usesCloudPlan],
  )

  const removeMealPlan = useCallback(
    (id: string) => {
      if (usesCloudPlan) {
        void fetch(`/api/plan?id=${id}`, { method: "DELETE" }).then(() => refreshCloudPlan())
        return
      }
      commit((prev) => ({
        ...prev,
        mealPlans: prev.mealPlans.filter((plan) => plan.id !== id),
      }))
    },
    [commit, refreshCloudPlan, usesCloudPlan],
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

  const allRecipes = useMemo(() => {
    const merged = [...state.recipes, ...SYSTEM_RECIPES, ...cloudRecipes]
    const seen = new Set<string>()
    return merged.filter((recipe) => {
      if (seen.has(recipe.id)) return false
      seen.add(recipe.id)
      return true
    })
  }, [cloudRecipes, state.recipes])

  const addMissingToShopping = useCallback(
    (recipe: Recipe) => {
      const names = recipe.ingredients
        .filter((ingredient) => !ingredient.optional)
        .map((ingredient) => ingredient.ingredientName)
      const { missing } = matchRecipeIngredients(state.inventory, names)
      let added = 0
      commit((prev) => {
        let shoppingList = prev.shoppingList
        for (const name of missing) {
          const exists = shoppingList.some(
            (item) => !item.checked && item.name.toLowerCase() === name.toLowerCase(),
          )
          if (exists) continue
          const ingredient = recipe.ingredients.find((item) => item.ingredientName === name)
          added += 1
          shoppingList = [
            {
              id: crypto.randomUUID(),
              userId: DEMO_USER_ID_VALUE,
              name,
              quantity: ingredient?.quantity ?? null,
              unit: ingredient?.unit ?? null,
              category: "other",
              checked: false,
              source: "meal_plan",
              createdAt: new Date().toISOString(),
            },
            ...shoppingList,
          ]
        }
        if (!added) return prev
        return { ...prev, shoppingList }
      })
      return added
    },
    [commit, state.inventory],
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
      mealPlans: usesCloudPlan ? cloudPlans : state.mealPlans,
      ready,
      allRecipes,
      usesCloudPlan,
      refreshCloudPlan,
      addInventoryItem,
      updateInventoryItem,
      removeInventoryItem,
      addRecipe,
      removeRecipe,
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
      cloudPlans,
      usesCloudPlan,
      refreshCloudPlan,
      ready,
      allRecipes,
      addInventoryItem,
      updateInventoryItem,
      removeInventoryItem,
      addRecipe,
      removeRecipe,
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
