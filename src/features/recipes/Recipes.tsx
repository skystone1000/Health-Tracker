import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
} from "@/components/ui";
import { filterRecipes, recipeNutritionPerServing } from "@/core/recipes";
import type { Recipe } from "@/core/schema";
import { fmt } from "@/lib/format";
import {
  selectAllRecipes,
  selectFoodsById,
  useAppStore,
} from "@/store/useAppStore";
import { RecipeDetail } from "./RecipeDetail";
import { RecipeEditor } from "./RecipeEditor";

export function Recipes() {
  const recipes = useAppStore(selectAllRecipes);
  const foodsById = useAppStore(selectFoodsById);
  const profile = useAppStore((s) => s.profile)!;
  const [params, setParams] = useSearchParams();

  const foodId = params.get("food") ?? undefined;
  const [search, setSearch] = useState("");
  const [respectDiet, setRespectDiet] = useState(true);
  const [viewing, setViewing] = useState<Recipe | null>(null);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [adding, setAdding] = useState(false);

  const foodName = foodId ? foodsById.get(foodId)?.name : undefined;

  const filtered = useMemo(
    () =>
      filterRecipes(recipes, foodsById, {
        dietType: respectDiet ? profile.dietType : "nonveg",
        exclusions: respectDiet ? profile.exclusions : [],
        search,
        foodId,
      }),
    [recipes, foodsById, respectDiet, profile, search, foodId],
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Recipes</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} recipes · cooking ideas built from your food
            database, with full per-serving nutrition.
          </p>
        </div>
        <Button onClick={() => setAdding(true)}>+ Add recipe</Button>
      </header>

      {foodName && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <span>
            Showing recipe options for <b>{foodName}</b>
          </span>
          <button
            className="text-primary underline"
            onClick={() => {
              params.delete("food");
              setParams(params);
            }}
          >
            clear
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-xs"
          placeholder="Search recipes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-2 rounded-lg border border-border px-3 text-sm">
          <input
            type="checkbox"
            checked={respectDiet}
            onChange={(e) => setRespectDiet(e.target.checked)}
          />
          Respect my diet ({profile.dietType})
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((recipe) => {
          const per = recipeNutritionPerServing(recipe, foodsById);
          return (
            <Card
              key={recipe.id}
              className="cursor-pointer transition-colors hover:border-primary/40"
              onClick={() => setViewing(recipe)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold leading-tight">
                    {recipe.name}
                  </div>
                  {recipe.source === "user" && (
                    <Badge variant="default">custom</Badge>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {recipe.cuisine} · {recipe.ingredients.length} ingredients ·{" "}
                  {recipe.servings} serving(s)
                </div>
                <div className="mt-3 flex gap-3 text-sm">
                  <span>
                    <b>{fmt(per.energy_kcal)}</b>{" "}
                    <span className="text-muted-foreground">kcal</span>
                  </span>
                  <span>
                    <b>{fmt(per.protein_g)}</b>{" "}
                    <span className="text-muted-foreground">g protein</span>
                  </span>
                  <span className="text-muted-foreground">/ serving</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {recipe.dietTypes.map((d) => (
                    <Badge key={d} variant="outline">
                      {d}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-muted-foreground">
            No recipes match your filters.
          </p>
        )}
      </div>

      <RecipeDetail
        recipe={viewing}
        foodsById={foodsById}
        open={!!viewing}
        onClose={() => setViewing(null)}
        onEdit={(r) => {
          setViewing(null);
          setEditing(r);
        }}
      />
      <RecipeEditor
        recipe={editing}
        foods={[...foodsById.values()]}
        open={!!editing}
        onClose={() => setEditing(null)}
      />
      <RecipeEditor
        recipe={null}
        foods={[...foodsById.values()]}
        open={adding}
        onClose={() => setAdding(false)}
      />
    </div>
  );
}
