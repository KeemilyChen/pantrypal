export const STORAGE_LOCATIONS = ["fridge", "freezer", "pantry"] as const
export type StorageLocation = (typeof STORAGE_LOCATIONS)[number]

export const INVENTORY_STATUSES = [
  "available",
  "used",
  "expired",
  "discarded",
] as const
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number]

export const INVENTORY_SOURCES = ["manual", "receipt", "recipe"] as const
export type InventorySource = (typeof INVENTORY_SOURCES)[number]

export const FOOD_CATEGORIES = [
  "produce",
  "meat",
  "seafood",
  "dairy",
  "grains",
  "pantry",
  "frozen",
  "beverages",
  "protein",
  "other",
] as const
export type FoodCategory = (typeof FOOD_CATEGORIES)[number]

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const
export type MealType = (typeof MEAL_TYPES)[number]

export const MEAL_PLAN_STATUSES = ["planned", "cooked", "skipped"] as const
export type MealPlanStatus = (typeof MEAL_PLAN_STATUSES)[number]

export const SHOPPING_SOURCES = ["manual", "meal_plan", "low_inventory"] as const
export type ShoppingSource = (typeof SHOPPING_SOURCES)[number]

export const FRIDGE_SHELVES = [
  "top",
  "middle",
  "drawer",
  "door",
  "freezer",
  "pantry",
] as const
export type FridgeShelf = (typeof FRIDGE_SHELVES)[number]

export type Profile = {
  id: string
  name: string
  avatarUrl: string | null
  createdAt: string
}

export type InventoryItem = {
  id: string
  userId: string
  name: string
  category: FoodCategory
  quantity: number
  unit: string
  storageLocation: StorageLocation
  purchaseDate: string | null
  expirationDate: string | null
  status: InventoryStatus
  source: InventorySource
  createdAt: string
  updatedAt: string
}

export const TAG_KINDS = ["cuisine", "diet", "ingredient", "meal", "method", "other"] as const
export type TagKind = (typeof TAG_KINDS)[number]

export const RECIPE_TAG_SOURCES = ["ai", "user", "ingredient"] as const
export type RecipeTagSource = (typeof RECIPE_TAG_SOURCES)[number]

export type RecipeIngredient = {
  id: string
  recipeId: string
  ingredientName: string
  quantity: number | null
  unit: string | null
  optional: boolean
}

export type RecipeTag = {
  id: string
  slug: string
  name: string
  kind: TagKind
  source?: RecipeTagSource
}

export type Recipe = {
  id: string
  userId: string | null
  name: string
  description: string
  instructions: string[]
  prepTime: number
  cookTime: number
  servings: number
  source: "system" | "user" | "ai"
  imageUrl: string | null
  createdAt: string
  isPublic?: boolean
  publishedAt?: string | null
  tags?: RecipeTag[]
  ingredients: RecipeIngredient[]
}

export type MealPlan = {
  id: string
  userId: string
  date: string
  mealType: MealType
  recipeId: string
  status: MealPlanStatus
  recipeName?: string
}

export type ShoppingItem = {
  id: string
  userId: string
  name: string
  quantity: number | null
  unit: string | null
  category: FoodCategory
  checked: boolean
  source: ShoppingSource
  createdAt: string
}

export type KitchenState = {
  profile: Profile
  inventory: InventoryItem[]
  recipes: Recipe[]
  mealPlans: MealPlan[]
  shoppingList: ShoppingItem[]
}

export type InventoryWrite = Omit<
  InventoryItem,
  "id" | "userId" | "createdAt" | "updatedAt" | "status" | "source"
> & {
  status?: InventoryStatus
  source?: InventorySource
}

export type RecipeWrite = Omit<Recipe, "id" | "userId" | "createdAt" | "source" | "ingredients"> & {
  ingredients: Omit<RecipeIngredient, "id" | "recipeId">[]
}
