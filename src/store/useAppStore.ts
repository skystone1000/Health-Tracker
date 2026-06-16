import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import {
  BackupSchema,
  FoodItemSchema,
  RdaTableSchema,
  RecipeSchema,
  type Backup,
  type FoodItem,
  type Plan,
  type RdaTable,
  type Recipe,
  type UserProfile,
} from "@/core/schema";
import { createEmptyPlan } from "@/core/planner";

export type Theme = "light" | "dark";

interface AppState {
  // ---- loaded reference data (not persisted) ----
  defaultFoods: FoodItem[];
  defaultRecipes: Recipe[];
  rda: RdaTable | null;
  loaded: boolean;
  loadError: string | null;

  // ---- persisted user data ----
  profile: UserProfile | null;
  customFoods: FoodItem[];
  foodOverrides: Record<string, FoodItem>;
  customRecipes: Recipe[];
  plans: Plan[];
  theme: Theme;

  // ---- actions ----
  init: () => Promise<void>;
  setProfile: (profile: UserProfile) => void;
  upsertFood: (food: FoodItem) => void;
  deleteFood: (id: string) => void;
  resetFood: (id: string) => void;
  upsertRecipe: (recipe: Recipe) => void;
  deleteRecipe: (id: string) => void;
  addRecipeToPlan: (recipe: Recipe, mealName: string, date?: string) => void;
  savePlan: (plan: Plan) => void;
  deletePlan: (id: string) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  exportBackup: () => Backup;
  importBackup: (data: unknown) => { ok: true } | { ok: false; error: string };
  resetUserData: () => void;
}

const FoodArraySchema = z.array(FoodItemSchema);
const RecipeArraySchema = z.array(RecipeSchema);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      defaultFoods: [],
      defaultRecipes: [],
      rda: null,
      loaded: false,
      loadError: null,

      profile: null,
      customFoods: [],
      foodOverrides: {},
      customRecipes: [],
      plans: [],
      theme: "light",

      init: async () => {
        if (get().loaded) return;
        try {
          const [foodsRes, rdaRes, recipesRes] = await Promise.all([
            fetch("/data/foods.default.json"),
            fetch("/data/rda.icmr-nin-2020.json"),
            fetch("/data/recipes.default.json"),
          ]);
          if (!foodsRes.ok || !rdaRes.ok || !recipesRes.ok)
            throw new Error("Failed to fetch seed data");
          const foods = FoodArraySchema.parse(await foodsRes.json());
          const rda = RdaTableSchema.parse(await rdaRes.json());
          const recipes = RecipeArraySchema.parse(await recipesRes.json());
          set({
            defaultFoods: foods,
            rda,
            defaultRecipes: recipes,
            loaded: true,
            loadError: null,
          });
        } catch (err) {
          set({ loadError: (err as Error).message, loaded: true });
        }
      },

      setProfile: (profile) => set({ profile }),

      upsertFood: (food) =>
        set((state) => {
          if (food.source === "user") {
            const exists = state.customFoods.some((f) => f.id === food.id);
            return {
              customFoods: exists
                ? state.customFoods.map((f) => (f.id === food.id ? food : f))
                : [...state.customFoods, food],
            };
          }
          // editing a default food → store an override (defaults stay pristine)
          return { foodOverrides: { ...state.foodOverrides, [food.id]: food } };
        }),

      deleteFood: (id) =>
        set((state) => ({
          customFoods: state.customFoods.filter((f) => f.id !== id),
        })),

      resetFood: (id) =>
        set((state) => {
          const next = { ...state.foodOverrides };
          delete next[id];
          return { foodOverrides: next };
        }),

      upsertRecipe: (recipe) =>
        set((state) => {
          const exists = state.customRecipes.some((r) => r.id === recipe.id);
          return {
            customRecipes: exists
              ? state.customRecipes.map((r) =>
                  r.id === recipe.id ? recipe : r,
                )
              : [...state.customRecipes, recipe],
          };
        }),

      deleteRecipe: (id) =>
        set((state) => ({
          customRecipes: state.customRecipes.filter((r) => r.id !== id),
        })),

      addRecipeToPlan: (recipe, mealName, date) =>
        set((state) => {
          const day = date ?? new Date().toISOString().slice(0, 10);
          const planId = `plan-${day}`;
          const existing = state.plans.find((p) => p.id === planId);
          const plan: Plan = existing
            ? structuredClone(existing)
            : createEmptyPlan(day);
          const meal =
            plan.meals.find((m) => m.name === mealName) ?? plan.meals[0];
          const servings = recipe.servings || 1;
          for (const ing of recipe.ingredients) {
            meal.items.push({
              foodId: ing.foodId,
              quantity: Math.round(ing.quantity / servings),
            });
          }
          return {
            plans: existing
              ? state.plans.map((p) => (p.id === planId ? plan : p))
              : [...state.plans, plan],
          };
        }),

      savePlan: (plan) =>
        set((state) => {
          const exists = state.plans.some((p) => p.id === plan.id);
          return {
            plans: exists
              ? state.plans.map((p) => (p.id === plan.id ? plan : p))
              : [...state.plans, plan],
          };
        }),

      deletePlan: (id) =>
        set((state) => ({ plans: state.plans.filter((p) => p.id !== id) })),

      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),

      exportBackup: () => {
        const { profile, customFoods, foodOverrides, customRecipes, plans } =
          get();
        return {
          version: 1,
          exportedAt: new Date().toISOString(),
          profile,
          customFoods,
          foodOverrides,
          customRecipes,
          plans,
        };
      },

      importBackup: (data) => {
        const parsed = BackupSchema.safeParse(data);
        if (!parsed.success)
          return { ok: false, error: "Invalid backup file format." };
        const b = parsed.data;
        set({
          profile: b.profile,
          customFoods: b.customFoods,
          foodOverrides: b.foodOverrides,
          customRecipes: b.customRecipes,
          plans: b.plans,
        });
        return { ok: true };
      },

      resetUserData: () =>
        set({
          profile: null,
          customFoods: [],
          foodOverrides: {},
          customRecipes: [],
          plans: [],
        }),
    }),
    {
      name: "nourish.store",
      partialize: (state) => ({
        profile: state.profile,
        customFoods: state.customFoods,
        foodOverrides: state.foodOverrides,
        customRecipes: state.customRecipes,
        plans: state.plans,
        theme: state.theme,
      }),
    },
  ),
);

/** Effective food list: defaults with overrides applied, plus custom foods. */
export function selectAllFoods(state: AppState): FoodItem[] {
  const withOverrides = state.defaultFoods.map(
    (f) => state.foodOverrides[f.id] ?? f,
  );
  return [...withOverrides, ...state.customFoods];
}

/** Map of id → effective food. */
export function selectFoodsById(state: AppState): Map<string, FoodItem> {
  return new Map(selectAllFoods(state).map((f) => [f.id, f]));
}

/** Effective recipe list: default recipes plus custom recipes. */
export function selectAllRecipes(state: AppState): Recipe[] {
  return [...state.defaultRecipes, ...state.customRecipes];
}
