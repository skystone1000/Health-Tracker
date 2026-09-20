import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import {
  FoodItemSchema,
  RdaTableSchema,
  RecipeSchema,
  type FoodItem,
  type Plan,
  type RdaTable,
  type Recipe,
  type UserProfile,
} from "@/core/schema";
import { BackupSchema, type Backup } from "@/core/backup";
import {
  ExerciseSchema,
  type Exercise,
  type WorkoutRoutine,
} from "@/core/exercise/schema";
import { AsanaSchema, type Asana, type Sequence } from "@/core/yoga/schema";
import {
  MedicineSchema,
  type Medicine,
  type MedicineStockEntry,
} from "@/core/medicine/schema";
import type { ActivityLogEntry } from "@/core/activity/schema";
import {
  entriesForDate,
  summarizeActivity,
  type ActivitySummary,
} from "@/core/activity/summary";
import type { FitnessProfile } from "@/core/fitness";
import { createEmptyPlan } from "@/core/planner";

export type Theme = "light" | "dark";

interface AppState {
  // ---- loaded reference data (not persisted) ----
  defaultFoods: FoodItem[];
  defaultRecipes: Recipe[];
  defaultExercises: Exercise[];
  defaultAsanas: Asana[];
  defaultMedicines: Medicine[];
  rda: RdaTable | null;
  loaded: boolean;
  loadError: string | null;

  // ---- persisted user data ----
  profile: UserProfile | null;
  customFoods: FoodItem[];
  foodOverrides: Record<string, FoodItem>;
  customRecipes: Recipe[];
  plans: Plan[];
  // movement
  fitness: FitnessProfile | null;
  customExercises: Exercise[];
  exerciseOverrides: Record<string, Exercise>;
  customAsanas: Asana[];
  asanaOverrides: Record<string, Asana>;
  workoutRoutines: WorkoutRoutine[];
  yogaSequences: Sequence[];
  activityLog: ActivityLogEntry[];
  customMedicines: Medicine[];
  medicineOverrides: Record<string, Medicine>;
  medicineStock: MedicineStockEntry[];
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
  savePlans: (plans: Plan[]) => void;
  deletePlan: (id: string) => void;
  // movement actions
  setFitness: (fitness: FitnessProfile) => void;
  upsertExercise: (exercise: Exercise) => void;
  deleteExercise: (id: string) => void;
  resetExercise: (id: string) => void;
  upsertAsana: (asana: Asana) => void;
  deleteAsana: (id: string) => void;
  resetAsana: (id: string) => void;
  saveRoutine: (routine: WorkoutRoutine) => void;
  deleteRoutine: (id: string) => void;
  saveSequence: (sequence: Sequence) => void;
  deleteSequence: (id: string) => void;
  logActivity: (entry: ActivityLogEntry) => void;
  deleteActivity: (id: string) => void;
  // medicine actions
  upsertMedicine: (medicine: Medicine) => void;
  deleteMedicine: (id: string) => void;
  resetMedicine: (id: string) => void;
  setStock: (entry: MedicineStockEntry) => void;
  deleteStock: (medicineId: string) => void;
  // misc
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  exportBackup: () => Backup;
  importBackup: (data: unknown) => { ok: true } | { ok: false; error: string };
  resetUserData: () => void;
}

const FoodArraySchema = z.array(FoodItemSchema);
const RecipeArraySchema = z.array(RecipeSchema);
const ExerciseArraySchema = z.array(ExerciseSchema);
const AsanaArraySchema = z.array(AsanaSchema);
const MedicineArraySchema = z.array(MedicineSchema);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      defaultFoods: [],
      defaultRecipes: [],
      defaultExercises: [],
      defaultAsanas: [],
      defaultMedicines: [],
      rda: null,
      loaded: false,
      loadError: null,

      profile: null,
      customFoods: [],
      foodOverrides: {},
      customRecipes: [],
      plans: [],
      fitness: null,
      customExercises: [],
      exerciseOverrides: {},
      customAsanas: [],
      asanaOverrides: {},
      workoutRoutines: [],
      yogaSequences: [],
      activityLog: [],
      customMedicines: [],
      medicineOverrides: {},
      medicineStock: [],
      theme: "light",

      init: async () => {
        if (get().loaded) return;
        try {
          const [
            foodsRes,
            rdaRes,
            recipesRes,
            exercisesRes,
            asanasRes,
            medicinesRes,
          ] = await Promise.all([
            fetch("/data/foods.default.json"),
            fetch("/data/rda.icmr-nin-2020.json"),
            fetch("/data/recipes.default.json"),
            fetch("/data/exercises.default.json"),
            fetch("/data/asanas.default.json"),
            fetch("/data/medicines.default.json"),
          ]);
          if (
            !foodsRes.ok ||
            !rdaRes.ok ||
            !recipesRes.ok ||
            !exercisesRes.ok ||
            !asanasRes.ok ||
            !medicinesRes.ok
          )
            throw new Error("Failed to fetch seed data");
          const foods = FoodArraySchema.parse(await foodsRes.json());
          const rda = RdaTableSchema.parse(await rdaRes.json());
          const recipes = RecipeArraySchema.parse(await recipesRes.json());
          const exercises = ExerciseArraySchema.parse(await exercisesRes.json());
          const asanas = AsanaArraySchema.parse(await asanasRes.json());
          const medicines = MedicineArraySchema.parse(await medicinesRes.json());
          set({
            defaultFoods: foods,
            rda,
            defaultRecipes: recipes,
            defaultExercises: exercises,
            defaultAsanas: asanas,
            defaultMedicines: medicines,
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

      /**
       * Upsert many plans in a single update — the weekly planner writes seven
       * days at once, and seven sequential `savePlan` calls would mean seven
       * store notifications and seven localStorage writes.
       */
      savePlans: (incoming) =>
        set((state) => {
          if (incoming.length === 0) return {};
          const byId = new Map(state.plans.map((p) => [p.id, p]));
          for (const plan of incoming) byId.set(plan.id, plan);
          return { plans: [...byId.values()] };
        }),

      deletePlan: (id) =>
        set((state) => ({ plans: state.plans.filter((p) => p.id !== id) })),

      // ---- movement actions ----
      setFitness: (fitness) => set({ fitness }),

      upsertExercise: (exercise) =>
        set((state) => {
          if (exercise.source === "user") {
            const exists = state.customExercises.some(
              (e) => e.id === exercise.id,
            );
            return {
              customExercises: exists
                ? state.customExercises.map((e) =>
                    e.id === exercise.id ? exercise : e,
                  )
                : [...state.customExercises, exercise],
            };
          }
          return {
            exerciseOverrides: {
              ...state.exerciseOverrides,
              [exercise.id]: exercise,
            },
          };
        }),

      deleteExercise: (id) =>
        set((state) => ({
          customExercises: state.customExercises.filter((e) => e.id !== id),
        })),

      resetExercise: (id) =>
        set((state) => {
          const next = { ...state.exerciseOverrides };
          delete next[id];
          return { exerciseOverrides: next };
        }),

      upsertAsana: (asana) =>
        set((state) => {
          if (asana.source === "user") {
            const exists = state.customAsanas.some((a) => a.id === asana.id);
            return {
              customAsanas: exists
                ? state.customAsanas.map((a) =>
                    a.id === asana.id ? asana : a,
                  )
                : [...state.customAsanas, asana],
            };
          }
          return {
            asanaOverrides: { ...state.asanaOverrides, [asana.id]: asana },
          };
        }),

      deleteAsana: (id) =>
        set((state) => ({
          customAsanas: state.customAsanas.filter((a) => a.id !== id),
        })),

      resetAsana: (id) =>
        set((state) => {
          const next = { ...state.asanaOverrides };
          delete next[id];
          return { asanaOverrides: next };
        }),

      saveRoutine: (routine) =>
        set((state) => {
          const exists = state.workoutRoutines.some((r) => r.id === routine.id);
          return {
            workoutRoutines: exists
              ? state.workoutRoutines.map((r) =>
                  r.id === routine.id ? routine : r,
                )
              : [...state.workoutRoutines, routine],
          };
        }),

      deleteRoutine: (id) =>
        set((state) => ({
          workoutRoutines: state.workoutRoutines.filter((r) => r.id !== id),
        })),

      saveSequence: (sequence) =>
        set((state) => {
          const exists = state.yogaSequences.some((s) => s.id === sequence.id);
          return {
            yogaSequences: exists
              ? state.yogaSequences.map((s) =>
                  s.id === sequence.id ? sequence : s,
                )
              : [...state.yogaSequences, sequence],
          };
        }),

      deleteSequence: (id) =>
        set((state) => ({
          yogaSequences: state.yogaSequences.filter((s) => s.id !== id),
        })),

      logActivity: (entry) =>
        set((state) => ({ activityLog: [entry, ...state.activityLog] })),

      deleteActivity: (id) =>
        set((state) => ({
          activityLog: state.activityLog.filter((e) => e.id !== id),
        })),

      // ---- medicine actions ----
      upsertMedicine: (medicine) =>
        set((state) => {
          if (medicine.source === "user") {
            const exists = state.customMedicines.some(
              (m) => m.id === medicine.id,
            );
            return {
              customMedicines: exists
                ? state.customMedicines.map((m) =>
                    m.id === medicine.id ? medicine : m,
                  )
                : [...state.customMedicines, medicine],
            };
          }
          // editing a default → store an override (defaults stay pristine)
          return {
            medicineOverrides: {
              ...state.medicineOverrides,
              [medicine.id]: medicine,
            },
          };
        }),

      deleteMedicine: (id) =>
        set((state) => ({
          customMedicines: state.customMedicines.filter((m) => m.id !== id),
          medicineStock: state.medicineStock.filter((e) => e.medicineId !== id),
        })),

      resetMedicine: (id) =>
        set((state) => {
          const next = { ...state.medicineOverrides };
          delete next[id];
          return { medicineOverrides: next };
        }),

      setStock: (entry) =>
        set((state) => {
          const exists = state.medicineStock.some(
            (e) => e.medicineId === entry.medicineId,
          );
          return {
            medicineStock: exists
              ? state.medicineStock.map((e) =>
                  e.medicineId === entry.medicineId ? entry : e,
                )
              : [...state.medicineStock, entry],
          };
        }),

      deleteStock: (medicineId) =>
        set((state) => ({
          medicineStock: state.medicineStock.filter(
            (e) => e.medicineId !== medicineId,
          ),
        })),

      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),

      exportBackup: () => {
        const s = get();
        return {
          version: 1,
          exportedAt: new Date().toISOString(),
          profile: s.profile,
          customFoods: s.customFoods,
          foodOverrides: s.foodOverrides,
          customRecipes: s.customRecipes,
          plans: s.plans,
          fitness: s.fitness,
          customExercises: s.customExercises,
          exerciseOverrides: s.exerciseOverrides,
          customAsanas: s.customAsanas,
          asanaOverrides: s.asanaOverrides,
          workoutRoutines: s.workoutRoutines,
          yogaSequences: s.yogaSequences,
          activityLog: s.activityLog,
          customMedicines: s.customMedicines,
          medicineOverrides: s.medicineOverrides,
          medicineStock: s.medicineStock,
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
          fitness: b.fitness,
          customExercises: b.customExercises,
          exerciseOverrides: b.exerciseOverrides,
          customAsanas: b.customAsanas,
          asanaOverrides: b.asanaOverrides,
          workoutRoutines: b.workoutRoutines,
          yogaSequences: b.yogaSequences,
          activityLog: b.activityLog,
          customMedicines: b.customMedicines,
          medicineOverrides: b.medicineOverrides,
          medicineStock: b.medicineStock,
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
          fitness: null,
          customExercises: [],
          exerciseOverrides: {},
          customAsanas: [],
          asanaOverrides: {},
          workoutRoutines: [],
          yogaSequences: [],
          activityLog: [],
          customMedicines: [],
          medicineOverrides: {},
          medicineStock: [],
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
        fitness: state.fitness,
        customExercises: state.customExercises,
        exerciseOverrides: state.exerciseOverrides,
        customAsanas: state.customAsanas,
        asanaOverrides: state.asanaOverrides,
        workoutRoutines: state.workoutRoutines,
        yogaSequences: state.yogaSequences,
        activityLog: state.activityLog,
        customMedicines: state.customMedicines,
        medicineOverrides: state.medicineOverrides,
        medicineStock: state.medicineStock,
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

/** Effective exercise list: defaults with overrides applied, plus custom. */
export function selectAllExercises(state: AppState): Exercise[] {
  const withOverrides = state.defaultExercises.map(
    (e) => state.exerciseOverrides[e.id] ?? e,
  );
  return [...withOverrides, ...state.customExercises];
}

export function selectExercisesById(state: AppState): Map<string, Exercise> {
  return new Map(selectAllExercises(state).map((e) => [e.id, e]));
}

/** Effective asana list: defaults with overrides applied, plus custom. */
export function selectAllAsanas(state: AppState): Asana[] {
  const withOverrides = state.defaultAsanas.map(
    (a) => state.asanaOverrides[a.id] ?? a,
  );
  return [...withOverrides, ...state.customAsanas];
}

export function selectAsanasById(state: AppState): Map<string, Asana> {
  return new Map(selectAllAsanas(state).map((a) => [a.id, a]));
}

/** Effective medicine list: defaults with overrides applied, plus custom. */
export function selectAllMedicines(state: AppState): Medicine[] {
  const withOverrides = state.defaultMedicines.map(
    (m) => state.medicineOverrides[m.id] ?? m,
  );
  return [...withOverrides, ...state.customMedicines];
}

export function selectMedicinesById(state: AppState): Map<string, Medicine> {
  return new Map(selectAllMedicines(state).map((m) => [m.id, m]));
}

/** Map of medicineId → stock entry (the personal cabinet layer). */
export function selectStockById(
  state: AppState,
): Map<string, MedicineStockEntry> {
  return new Map(state.medicineStock.map((e) => [e.medicineId, e]));
}

/** Set of medicine ids the user currently owns (for the library "owned" badge). */
export function selectOwnedMedicineIds(state: AppState): Set<string> {
  return new Set(
    state.medicineStock.filter((e) => e.owned).map((e) => e.medicineId),
  );
}

/** Aggregate today's logged activity — the only thing the dashboard depends on. */
export function summarizeForDate(
  entries: ActivityLogEntry[],
  date: string,
): ActivitySummary {
  return summarizeActivity(entriesForDate(entries, date));
}
