import { useState } from "react";
import {
  Badge,
  Button,
  Modal,
  Select,
  SourceLink,
} from "@/components/ui";
import { DEFAULT_MEAL_NAMES } from "@/core/planner";
import { recipeNutritionPerServing } from "@/core/recipes";
import type { FoodItem, Recipe } from "@/core/schema";
import { nutrientsForQuantity } from "@/core/totals";
import { NutrientTable } from "@/features/shared/NutrientTable";
import { useTargets } from "@/features/shared/useTargets";
import { fmt } from "@/lib/format";
import { useAppStore } from "@/store/useAppStore";

export function RecipeDetail({
  recipe,
  foodsById,
  open,
  onClose,
  onEdit,
}: {
  recipe: Recipe | null;
  foodsById: Map<string, FoodItem>;
  open: boolean;
  onClose: () => void;
  onEdit?: (recipe: Recipe) => void;
}) {
  const addRecipeToPlan = useAppStore((s) => s.addRecipeToPlan);
  const deleteRecipe = useAppStore((s) => s.deleteRecipe);
  const breakdown = useTargets();
  const [meal, setMeal] = useState(DEFAULT_MEAL_NAMES[1]);
  const [added, setAdded] = useState(false);

  if (!recipe) return null;
  const perServing = recipeNutritionPerServing(recipe, foodsById);

  return (
    <Modal open={open} onClose={onClose} title={recipe.name} className="max-w-2xl">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{recipe.cuisine}</Badge>
          {recipe.dietTypes.map((d) => (
            <Badge key={d} variant="outline">
              {d}
            </Badge>
          ))}
          <Badge variant="default">{recipe.servings} serving(s)</Badge>
          {recipe.source === "user" && <Badge variant="default">custom</Badge>}
          <span className="ml-auto text-sm text-muted-foreground">
            <b className="text-foreground">{fmt(perServing.energy_kcal)}</b> kcal
            · <b className="text-foreground">{fmt(perServing.protein_g)}</b> g
            protein / serving
          </span>
        </div>

        {/* Ingredients */}
        <div>
          <h4 className="mb-2 text-sm font-semibold">Ingredients</h4>
          <ul className="space-y-1 text-sm">
            {recipe.ingredients.map((ing, i) => {
              const food = foodsById.get(ing.foodId);
              const kcal = food
                ? nutrientsForQuantity(food, ing.quantity).energy_kcal
                : 0;
              return (
                <li
                  key={i}
                  className="flex items-center justify-between border-b border-border/60 py-1"
                >
                  <span>{food ? food.name : ing.foodId}</span>
                  <span className="text-muted-foreground">
                    {fmt(ing.quantity)} {food?.servingUnit ?? "g"} ·{" "}
                    {fmt(kcal)} kcal
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Steps */}
        {recipe.steps.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold">Method</h4>
            <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              {recipe.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {recipe.notes && (
          <p className="rounded-lg bg-secondary/60 p-3 text-sm text-muted-foreground">
            💡 {recipe.notes}
          </p>
        )}

        {/* References — where the method and any nutrition claim come from */}
        {recipe.references.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold">References</h4>
            {(["recipe", "nutrition"] as const).map((kind) => {
              const refs = recipe.references.filter((r) => r.kind === kind);
              if (refs.length === 0) return null;
              return (
                <div key={kind} className="mb-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {kind === "recipe" ? "Method" : "Nutrition"}
                  </div>
                  <ul className="mt-1 space-y-1 text-sm">
                    {refs.map((r, i) => (
                      <li key={i}>
                        <SourceLink url={r.url}>{r.title}</SourceLink>
                        <span className="text-muted-foreground"> · {r.source}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {/* Nutrition per serving vs daily targets */}
        {breakdown && (
          <div>
            <h4 className="mb-2 text-sm font-semibold">
              Per serving — share of your daily targets
            </h4>
            <NutrientTable totals={perServing} targets={breakdown.targets} />
          </div>
        )}

        {/* Add to plan */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">Add 1 serving to</span>
          <Select
            className="h-9 w-auto"
            value={meal}
            onChange={(e) => setMeal(e.target.value)}
          >
            {DEFAULT_MEAL_NAMES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
          <Button
            size="sm"
            onClick={() => {
              addRecipeToPlan(recipe, meal);
              setAdded(true);
              setTimeout(() => setAdded(false), 2500);
            }}
          >
            {added ? "✓ Added to today's plan" : "Add to plan"}
          </Button>
          <div className="ml-auto flex gap-2">
            {recipe.source === "user" && onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(recipe)}>
                Edit
              </Button>
            )}
            {recipe.source === "user" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  deleteRecipe(recipe.id);
                  onClose();
                }}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
