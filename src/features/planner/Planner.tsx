import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Tabs,
} from "@/components/ui";
import { autoGeneratePlan, createEmptyPlan } from "@/core/planner";
import {
  PLANNER_MODES,
  type FoodItem,
  type Plan,
  type PlannerMode,
} from "@/core/schema";
import { mealTotals, nutrientsForQuantity, planTotals } from "@/core/totals";
import { Ring } from "@/features/shared/Ring";
import { NutrientTable } from "@/features/shared/NutrientTable";
import { useTargets } from "@/features/shared/useTargets";
import { fmt } from "@/lib/format";
import {
  selectAllFoods,
  selectFoodsById,
  useAppStore,
} from "@/store/useAppStore";
import { FoodPicker } from "./FoodPicker";

const today = () => new Date().toISOString().slice(0, 10);

const MODE_TABS: { value: PlannerMode; label: string }[] = [
  { value: "targetsOnly", label: "Targets only" },
  { value: "mealBuilder", label: "Meal builder" },
  { value: "autoGenerate", label: "Auto-generate" },
];

export function Planner() {
  const profile = useAppStore((s) => s.profile)!;
  const setProfile = useAppStore((s) => s.setProfile);
  const savePlan = useAppStore((s) => s.savePlan);
  const plans = useAppStore((s) => s.plans);
  const allFoods = useAppStore(selectAllFoods);
  const foodsById = useAppStore(selectFoodsById);
  const breakdown = useTargets();

  const planId = `plan-${today()}`;
  const stored = plans.find((p) => p.id === planId);
  const [plan, setPlan] = useState<Plan>(stored ?? createEmptyPlan(today()));
  const [picker, setPicker] = useState<number | null>(null);

  const mode = profile.plannerMode;
  const setMode = (m: PlannerMode) =>
    setProfile({ ...profile, plannerMode: m as PlannerMode });

  const totals = useMemo(
    () => planTotals(plan, foodsById),
    [plan, foodsById],
  );

  const persist = (next: Plan) => {
    setPlan(next);
    savePlan(next);
  };

  const addItem = (mealIndex: number, food: FoodItem) => {
    const next = structuredClone(plan);
    next.meals[mealIndex].items.push({
      foodId: food.id,
      quantity: food.referenceQuantity,
    });
    persist(next);
  };

  const setQty = (mealIndex: number, itemIndex: number, qty: number) => {
    const next = structuredClone(plan);
    next.meals[mealIndex].items[itemIndex].quantity = Math.max(0, qty);
    persist(next);
  };

  const removeItem = (mealIndex: number, itemIndex: number) => {
    const next = structuredClone(plan);
    next.meals[mealIndex].items.splice(itemIndex, 1);
    persist(next);
  };

  const autoGenerate = () => {
    if (!breakdown) return;
    persist(autoGeneratePlan(profile, breakdown.calories, allFoods, { date: today() }));
  };

  const clearPlan = () => persist(createEmptyPlan(today()));

  if (!breakdown) return null;
  const { targets } = breakdown;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Planner</h1>
          <p className="text-sm text-muted-foreground">
            Targets build into a meal builder, which builds into auto-generate —
            pick your mode.
          </p>
        </div>
        <Tabs
          options={MODE_TABS.filter((t) => PLANNER_MODES.includes(t.value))}
          value={mode}
          onChange={(v) => setMode(v as PlannerMode)}
        />
      </header>

      {/* Live summary (all modes) */}
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "targetsOnly" ? "Your daily targets" : "Today vs target"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Ring value={totals.energy_kcal} target={targets.energy_kcal} label="Energy" unit="kcal" />
          <Ring value={totals.protein_g} target={targets.protein_g} label="Protein" unit="g" color="hsl(217 91% 60%)" />
          <Ring value={totals.carbs_g} target={targets.carbs_g} label="Carbs" unit="g" color="hsl(45 93% 47%)" />
          <Ring value={totals.fat_g} target={targets.fat_g} label="Fat" unit="g" color="hsl(280 65% 60%)" />
        </CardContent>
      </Card>

      {mode === "targetsOnly" && (
        <Card>
          <CardHeader>
            <CardTitle>Full nutrient targets</CardTitle>
          </CardHeader>
          <CardContent>
            <NutrientTable totals={totals} targets={targets} />
          </CardContent>
        </Card>
      )}

      {(mode === "mealBuilder" || mode === "autoGenerate") && (
        <>
          <div className="flex flex-wrap gap-2">
            {mode === "autoGenerate" && (
              <Button onClick={autoGenerate}>⚡ Auto-generate full day</Button>
            )}
            <Button variant="outline" onClick={clearPlan}>
              Clear plan
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {plan.meals.map((meal, mealIndex) => {
              const mt = mealTotals(meal, foodsById);
              return (
                <Card key={meal.name}>
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>{meal.name}</CardTitle>
                    <Badge variant="secondary">{fmt(mt.energy_kcal)} kcal</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {meal.items.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No items yet.
                      </p>
                    )}
                    {meal.items.map((item, itemIndex) => {
                      const food = foodsById.get(item.foodId);
                      if (!food) return null;
                      const kcal = nutrientsForQuantity(
                        food,
                        item.quantity,
                      ).energy_kcal;
                      return (
                        <div
                          key={itemIndex}
                          className="flex items-center gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {food.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {fmt(kcal)} kcal
                            </div>
                          </div>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              setQty(mealIndex, itemIndex, Number(e.target.value))
                            }
                            className="h-8 w-20"
                          />
                          <span className="text-xs text-muted-foreground">
                            {food.servingUnit}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeItem(mealIndex, itemIndex)}
                          >
                            ✕
                          </Button>
                        </div>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setPicker(mealIndex)}
                    >
                      + Add food
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Full nutrient breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <NutrientTable totals={totals} targets={targets} />
            </CardContent>
          </Card>
        </>
      )}

      <FoodPicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        foods={allFoods}
        profile={profile}
        onPick={(food) => picker !== null && addItem(picker, food)}
      />
    </div>
  );
}
