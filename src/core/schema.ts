import { z } from "zod";

/**
 * Canonical nutrient keys (flat vector form used by the engine).
 * The food JSON keeps these grouped (macros/vitamins/minerals); `toVector`
 * flattens a food's nutrients into this flat shape for math.
 */
export const MACRO_KEYS = [
  "protein_g",
  "carbs_g",
  "fiber_g",
  "fat_g",
  "sugar_g",
] as const;

export const VITAMIN_KEYS = [
  "vit_a_ug",
  "vit_c_mg",
  "vit_d_ug",
  "thiamin_b1_mg",
  "riboflavin_b2_mg",
  "niacin_b3_mg",
  "folate_b9_ug",
  "vit_b12_ug",
  "vit_e_mg",
  "vit_k_ug",
] as const;

export const MINERAL_KEYS = [
  "calcium_mg",
  "iron_mg",
  "magnesium_mg",
  "potassium_mg",
  "sodium_mg",
  "zinc_mg",
  "phosphorus_mg",
  "selenium_ug",
] as const;

export const NUTRIENT_KEYS = [
  "energy_kcal",
  ...MACRO_KEYS,
  ...VITAMIN_KEYS,
  ...MINERAL_KEYS,
] as const;

export type NutrientKey = (typeof NUTRIENT_KEYS)[number];
export type MicronutrientKey =
  | (typeof VITAMIN_KEYS)[number]
  | (typeof MINERAL_KEYS)[number];

export type NutrientVector = Record<NutrientKey, number>;

/** Human-readable labels + display units for every nutrient. */
export const NUTRIENT_META: Record<
  NutrientKey,
  { label: string; unit: string; group: "energy" | "macro" | "vitamin" | "mineral" }
> = {
  energy_kcal: { label: "Energy", unit: "kcal", group: "energy" },
  protein_g: { label: "Protein", unit: "g", group: "macro" },
  carbs_g: { label: "Carbohydrates", unit: "g", group: "macro" },
  fiber_g: { label: "Fiber", unit: "g", group: "macro" },
  fat_g: { label: "Fat", unit: "g", group: "macro" },
  sugar_g: { label: "Sugar", unit: "g", group: "macro" },
  vit_a_ug: { label: "Vitamin A", unit: "µg", group: "vitamin" },
  vit_c_mg: { label: "Vitamin C", unit: "mg", group: "vitamin" },
  vit_d_ug: { label: "Vitamin D", unit: "µg", group: "vitamin" },
  thiamin_b1_mg: { label: "Thiamin (B1)", unit: "mg", group: "vitamin" },
  riboflavin_b2_mg: { label: "Riboflavin (B2)", unit: "mg", group: "vitamin" },
  niacin_b3_mg: { label: "Niacin (B3)", unit: "mg", group: "vitamin" },
  folate_b9_ug: { label: "Folate (B9)", unit: "µg", group: "vitamin" },
  vit_b12_ug: { label: "Vitamin B12", unit: "µg", group: "vitamin" },
  vit_e_mg: { label: "Vitamin E", unit: "mg", group: "vitamin" },
  vit_k_ug: { label: "Vitamin K", unit: "µg", group: "vitamin" },
  calcium_mg: { label: "Calcium", unit: "mg", group: "mineral" },
  iron_mg: { label: "Iron", unit: "mg", group: "mineral" },
  magnesium_mg: { label: "Magnesium", unit: "mg", group: "mineral" },
  potassium_mg: { label: "Potassium", unit: "mg", group: "mineral" },
  sodium_mg: { label: "Sodium", unit: "mg", group: "mineral" },
  zinc_mg: { label: "Zinc", unit: "mg", group: "mineral" },
  phosphorus_mg: { label: "Phosphorus", unit: "mg", group: "mineral" },
  selenium_ug: { label: "Selenium", unit: "µg", group: "mineral" },
};

/**
 * Adult USDA-DRI fallback values, used when the regional RDA table lacks a
 * value for a micronutrient. Keeps target panels complete.
 */
export const MICRO_FALLBACK: Record<MicronutrientKey, number> = {
  vit_a_ug: 800,
  vit_c_mg: 80,
  vit_d_ug: 15,
  thiamin_b1_mg: 1.2,
  riboflavin_b2_mg: 1.3,
  niacin_b3_mg: 16,
  folate_b9_ug: 300,
  vit_b12_ug: 2.2,
  vit_e_mg: 10,
  vit_k_ug: 110,
  calcium_mg: 1000,
  iron_mg: 17,
  magnesium_mg: 370,
  potassium_mg: 3500,
  sodium_mg: 2000,
  zinc_mg: 12,
  phosphorus_mg: 700,
  selenium_ug: 40,
};

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const numbersFor = <T extends readonly string[]>(keys: T) =>
  z.object(
    Object.fromEntries(keys.map((k) => [k, z.number()])) as {
      [K in T[number]]: z.ZodNumber;
    },
  );

export const MacrosSchema = numbersFor(MACRO_KEYS);
export const VitaminsSchema = numbersFor(VITAMIN_KEYS);
export const MineralsSchema = numbersFor(MINERAL_KEYS);

export const NutrientsSchema = z.object({
  energy_kcal: z.number(),
  macros: MacrosSchema,
  vitamins: VitaminsSchema,
  minerals: MineralsSchema,
});
export type Nutrients = z.infer<typeof NutrientsSchema>;

export const DIET_TYPES = ["veg", "nonveg", "vegan"] as const;
export const DietTypeSchema = z.enum(DIET_TYPES);
export type DietType = z.infer<typeof DietTypeSchema>;

export const FOOD_CATEGORIES = [
  "Grains & Cereals",
  "Legumes & Pulses",
  "Vegetables",
  "Fruits",
  "Dairy",
  "Eggs",
  "Meat & Seafood",
  "Nuts, Seeds & Dry Fruits",
  "Fats & Oils",
  "Spices & Condiments",
  "Sweets & Desserts",
  "Beverages",
] as const;
export const FoodCategorySchema = z.enum(FOOD_CATEGORIES);
export type FoodCategory = z.infer<typeof FoodCategorySchema>;

export const MEAL_TYPES = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "dessert",
  "side",
] as const;
export const MealTypeSchema = z.enum(MEAL_TYPES);
export type MealType = z.infer<typeof MealTypeSchema>;

export const FOOD_REGIONS = [
  "Maharashtrian",
  "South Indian",
  "North Indian",
  "Gujarati",
  "Bengali",
  "Punjabi",
  "Pan-Indian",
  "Global",
] as const;
export const FoodRegionSchema = z.enum(FOOD_REGIONS);
export type FoodRegion = z.infer<typeof FoodRegionSchema>;

export const PREP_STYLES = [
  "raw",
  "boiled",
  "steamed",
  "sauteed",
  "fried",
  "deepFried",
  "fermented",
  "roasted",
  "baked",
  "dried",
] as const;
export const PrepStyleSchema = z.enum(PREP_STYLES);
export type PrepStyle = z.infer<typeof PrepStyleSchema>;

export const ITEM_TYPES = ["ingredient", "dish"] as const;
export const ItemTypeSchema = z.enum(ITEM_TYPES);
export type ItemType = z.infer<typeof ItemTypeSchema>;

/**
 * A citation for a recipe's method or for a nutrition claim. Distinct from
 * `Evidence` (which records a nutrient value actually seen in a source).
 */
export const ReferenceSchema = z.object({
  title: z.string(),
  source: z.string(),
  url: z.string(),
  kind: z.enum(["recipe", "nutrition"]).default("recipe"),
});
export type Reference = z.infer<typeof ReferenceSchema>;

export const EvidenceSchema = z.object({
  source: z.string(),
  ref: z.string().optional(),
  value_seen: z.string().optional(),
  url: z.string().optional(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const VerificationSchema = z.object({
  status: z.enum(["verified", "needsReview", "unverified"]),
  confidence: z.enum(["high", "medium", "low"]),
  lastReviewed: z.string().optional(),
});

export const FoodItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).default([]),
  // Kept permissive on purpose: a user's persisted custom food may carry a
  // free-form category. The strict FOOD_CATEGORIES enum is enforced on the
  // default seed data by core/data.test.ts, so defaults stay disciplined
  // without ever breaking someone's localStorage.
  category: z.string(),
  dietTypes: z.array(DietTypeSchema).min(1),
  allergens: z.array(z.string()).default([]),
  servingUnit: z.string().default("g"),
  referenceQuantity: z.number().positive().default(100),
  nutrients: NutrientsSchema,
  evidences: z.array(EvidenceSchema).default([]),
  verification: VerificationSchema.default({
    status: "unverified",
    confidence: "low",
  }),
  source: z.enum(["default", "user"]).default("default"),
  editable: z.boolean().default(true),
  // Facets — optional so every previously persisted food still parses.
  mealTypes: z.array(MealTypeSchema).default([]),
  region: FoodRegionSchema.optional(),
  prep: PrepStyleSchema.optional(),
  itemType: ItemTypeSchema.default("ingredient"),
});
export type FoodItem = z.infer<typeof FoodItemSchema>;

export const ACTIVITY_LEVELS = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "veryActive",
] as const;
export const ActivityLevelSchema = z.enum(ACTIVITY_LEVELS);
export type ActivityLevel = z.infer<typeof ActivityLevelSchema>;

export const WORK_TYPES = ["desk", "onFeet", "physicalLabor", "athlete"] as const;
export const WorkTypeSchema = z.enum(WORK_TYPES);
export type WorkType = z.infer<typeof WorkTypeSchema>;

export const PLANNER_MODES = [
  "targetsOnly",
  "mealBuilder",
  "autoGenerate",
  "weekly",
] as const;
export const PlannerModeSchema = z.enum(PLANNER_MODES);
export type PlannerMode = z.infer<typeof PlannerModeSchema>;

export const UserProfileSchema = z.object({
  id: z.string().default("local"),
  name: z.string().default(""),
  age: z.number().int().min(2).max(120),
  sex: z.enum(["male", "female"]),
  heightCm: z.number().positive(),
  weightKg: z.number().positive(),
  activityLevel: ActivityLevelSchema,
  workType: WorkTypeSchema.default("desk"),
  goal: z.enum(["lose", "maintain", "gain"]).default("maintain"),
  dietType: DietTypeSchema.default("veg"),
  exclusions: z.array(z.string()).default([]),
  plannerMode: PlannerModeSchema.default("mealBuilder"),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const PlanItemSchema = z.object({
  foodId: z.string(),
  quantity: z.number().nonnegative(), // in the food's servingUnit
});
export type PlanItem = z.infer<typeof PlanItemSchema>;

export const MealSchema = z.object({
  name: z.string(),
  items: z.array(PlanItemSchema).default([]),
});
export type Meal = z.infer<typeof MealSchema>;

export const PlanSchema = z.object({
  id: z.string(),
  date: z.string(),
  meals: z.array(MealSchema).default([]),
});
export type Plan = z.infer<typeof PlanSchema>;

// Recipes — a dish made from food items; nutrition is computed from ingredients.
export const RecipeIngredientSchema = z.object({
  foodId: z.string(),
  quantity: z.number().nonnegative(), // total for the whole recipe
});
export type RecipeIngredient = z.infer<typeof RecipeIngredientSchema>;

export const RecipeSchema = z.object({
  id: z.string(),
  name: z.string(),
  cuisine: z.string().default("Indian"),
  dietTypes: z.array(DietTypeSchema).min(1),
  // foods this recipe is an "option" for (drives per-food recipe suggestions)
  baseFoodIds: z.array(z.string()).default([]),
  servings: z.number().positive().default(1),
  ingredients: z.array(RecipeIngredientSchema).min(1),
  steps: z.array(z.string()).default([]),
  notes: z.string().optional(),
  /**
   * Cooked weight of the whole recipe, in grams. Optional, but required to
   * compare a dish's own nutrient panel against what its recipe computes to:
   * dishes that absorb water (khichdi, upma) weigh far more cooked than the
   * sum of their raw ingredients, so ingredient mass alone is not a yield.
   */
  yieldGrams: z.number().positive().optional(),
  references: z.array(ReferenceSchema).default([]),
  mealTypes: z.array(MealTypeSchema).default([]),
  region: FoodRegionSchema.optional(),
  source: z.enum(["default", "user"]).default("default"),
});
export type Recipe = z.infer<typeof RecipeSchema>;

// RDA reference table (micronutrient targets by sex + age bracket)
export const RdaBracketSchema = z.object({
  sex: z.enum(["male", "female"]),
  minAge: z.number(),
  maxAge: z.number(),
  values: numbersFor([...MACRO_KEYS, ...VITAMIN_KEYS, ...MINERAL_KEYS]).partial(),
});
export const RdaTableSchema = z.object({
  source: z.string(),
  notes: z.string().optional(),
  brackets: z.array(RdaBracketSchema),
});
export type RdaTable = z.infer<typeof RdaTableSchema>;

// The full backup payload (export/import) lives in `core/backup.ts`, which
// aggregates persisted slices from every domain (nutrition + movement).
