export const SYSTEM_RECIPES = [
  {
    id: 'sys-chicken-stir-fry',
    name: 'Chicken Stir Fry',
    description: 'A fast weeknight pan with chicken, broccoli, and a soy-garlic glaze.',
    prepTime: 10,
    cookTime: 15,
    instructions: [
      'Slice the chicken and cut broccoli into bite-size florets.',
      'Heat oil in a large skillet over medium-high heat.',
      'Cook the chicken until no longer pink, about 5 minutes.',
      'Add garlic and broccoli and cook for 3 minutes.',
      'Pour in soy sauce and a splash of water. Toss until glossy.',
      'Serve over rice.',
    ],
    ingredients: [
      { ingredientName: 'Chicken Breast', optional: false },
      { ingredientName: 'Broccoli', optional: false },
      { ingredientName: 'Rice', optional: false },
      { ingredientName: 'Soy sauce', optional: false },
      { ingredientName: 'Garlic', optional: false },
      { ingredientName: 'Green onion', optional: true },
    ],
  },
  {
    id: 'sys-chicken-fried-rice',
    name: 'Chicken Fried Rice',
    description: 'Use leftover rice, eggs, and chicken for a skillet dinner.',
    prepTime: 8,
    cookTime: 12,
    instructions: [
      'Scramble the eggs in a hot oiled pan, then set aside.',
      'Add chicken and cook until warmed through.',
      'Stir in rice, breaking up clumps.',
      'Add soy sauce and the scrambled eggs.',
      'Finish with green onion if you have it.',
    ],
    ingredients: [
      { ingredientName: 'Chicken Breast', optional: false },
      { ingredientName: 'Rice', optional: false },
      { ingredientName: 'Eggs', optional: false },
      { ingredientName: 'Soy sauce', optional: false },
      { ingredientName: 'Green onion', optional: true },
    ],
  },
  {
    id: 'sys-spinach-omelette',
    name: 'Spinach Omelette',
    description: 'A 10-minute breakfast that uses up tender greens.',
    prepTime: 5,
    cookTime: 5,
    instructions: [
      'Beat the eggs with a pinch of salt.',
      'Wilt spinach in a buttered or oiled pan.',
      'Pour in eggs and cook until just set.',
      'Add cheese if using, fold, and serve.',
    ],
    ingredients: [
      { ingredientName: 'Eggs', optional: false },
      { ingredientName: 'Spinach', optional: false },
      { ingredientName: 'Cheese', optional: true },
      { ingredientName: 'Milk', optional: true },
    ],
  },
  {
    id: 'sys-garlic-broccoli',
    name: 'Garlic Broccoli',
    description: 'A simple side when you need to cook produce tonight.',
    prepTime: 5,
    cookTime: 8,
    instructions: [
      'Cut broccoli into florets.',
      'Steam or sauté with a splash of water until bright green.',
      'Add garlic and oil, cook 1 minute more.',
      'Season and serve.',
    ],
    ingredients: [
      { ingredientName: 'Broccoli', optional: false },
      { ingredientName: 'Garlic', optional: false },
      { ingredientName: 'Olive oil', optional: false },
    ],
  },
  {
    id: 'sys-cheesy-eggs',
    name: 'Cheesy Scramble',
    description: 'Soft scrambled eggs with cheese — comfort food in a pan.',
    prepTime: 3,
    cookTime: 6,
    instructions: [
      'Whisk eggs with a splash of milk.',
      'Cook low and slow, stirring often.',
      'Fold in cheese just before the eggs set.',
    ],
    ingredients: [
      { ingredientName: 'Eggs', optional: false },
      { ingredientName: 'Cheese', optional: false },
      { ingredientName: 'Milk', optional: true },
    ],
  },
  {
    id: 'sys-chicken-rice-bowl',
    name: 'Chicken Rice Bowl',
    description: 'Simple bowl: seasoned chicken, rice, and whatever vegetables you have.',
    prepTime: 10,
    cookTime: 20,
    instructions: [
      'Cook rice.',
      'Season and pan-cook chicken until done.',
      'Sauté broccoli or carrots on the side.',
      'Assemble bowls and drizzle with soy sauce.',
    ],
    ingredients: [
      { ingredientName: 'Chicken Breast', optional: false },
      { ingredientName: 'Rice', optional: false },
      { ingredientName: 'Broccoli', optional: true },
      { ingredientName: 'Carrots', optional: true },
      { ingredientName: 'Soy sauce', optional: false },
    ],
  },
  {
    id: 'sys-carrot-salad',
    name: 'Quick Carrot Salad',
    description: 'Crunchy, no-cook side when the oven is already busy.',
    prepTime: 10,
    cookTime: 0,
    instructions: [
      'Grate or julienne the carrots.',
      'Toss with oil and a pinch of salt.',
      'Add garlic if you like it punchy.',
    ],
    ingredients: [
      { ingredientName: 'Carrots', optional: false },
      { ingredientName: 'Olive oil', optional: false },
      { ingredientName: 'Garlic', optional: true },
    ],
  },
  {
    id: 'sys-dumpling-skillet',
    name: 'Pan-Fried Dumplings',
    description: 'Crispy freezer dumplings with a soy dip — almost no prep.',
    prepTime: 2,
    cookTime: 12,
    instructions: [
      'Add a thin layer of oil to a skillet.',
      'Arrange dumplings and cook until bottoms are golden.',
      'Add a splash of water, cover, and steam 6 minutes.',
      'Serve with soy sauce.',
    ],
    ingredients: [
      { ingredientName: 'Dumplings', optional: false },
      { ingredientName: 'Soy sauce', optional: false },
      { ingredientName: 'Olive oil', optional: false },
    ],
  },
]

export function catalogForRequest() {
  return SYSTEM_RECIPES.map((recipe) => ({
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    cookTime: recipe.cookTime,
    prepTime: recipe.prepTime,
    ingredients: recipe.ingredients.map((item) => item.ingredientName),
  }))
}

export function findCatalogRecipe(id, name) {
  return (
    SYSTEM_RECIPES.find((recipe) => recipe.id === id) ||
    SYSTEM_RECIPES.find((recipe) => recipe.name.toLowerCase() === String(name || '').toLowerCase()) ||
    null
  )
}
