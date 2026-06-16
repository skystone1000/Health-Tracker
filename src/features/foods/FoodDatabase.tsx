import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Select,
} from "@/components/ui";
import { applyFilters } from "@/core/filters";
import { recipesForFood } from "@/core/recipes";
import type { FoodItem } from "@/core/schema";
import { fmt } from "@/lib/format";
import {
  selectAllFoods,
  selectAllRecipes,
  useAppStore,
} from "@/store/useAppStore";
import { FoodEditor } from "./FoodEditor";

function VerifiedBadge({ food }: { food: FoodItem }) {
  if (food.verification.status === "verified")
    return <Badge variant="success">✓ Verified</Badge>;
  if (food.verification.status === "needsReview")
    return <Badge variant="warning">⚠ Needs review</Badge>;
  return <Badge variant="secondary">Unverified</Badge>;
}

export function FoodDatabase() {
  const allFoods = useAppStore(selectAllFoods);
  const allRecipes = useAppStore(selectAllRecipes);
  const overrides = useAppStore((s) => s.foodOverrides);
  const profile = useAppStore((s) => s.profile)!;
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [respectDiet, setRespectDiet] = useState(true);
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [adding, setAdding] = useState(false);

  const categories = useMemo(
    () => [...new Set(allFoods.map((f) => f.category))].sort(),
    [allFoods],
  );

  const filtered = useMemo(
    () =>
      applyFilters(allFoods, {
        dietType: respectDiet ? profile.dietType : "nonveg",
        exclusions: respectDiet ? profile.exclusions : [],
        search,
        category: category || undefined,
      }),
    [allFoods, respectDiet, profile, search, category],
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Food database</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} foods · click any to view or edit its nutrients &
            sources
          </p>
        </div>
        <Button onClick={() => setAdding(true)}>+ Add food</Button>
      </header>

      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-xs"
          placeholder="Search foods…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          className="max-w-[180px]"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
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
        {filtered.map((food) => (
          <Card
            key={food.id}
            className="cursor-pointer transition-colors hover:border-primary/40"
            onClick={() => setEditing(food)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold leading-tight">{food.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {food.category}
                  </div>
                </div>
                <VerifiedBadge food={food} />
              </div>
              <div className="mt-3 flex gap-3 text-sm">
                <span>
                  <b>{fmt(food.nutrients.energy_kcal)}</b>{" "}
                  <span className="text-muted-foreground">kcal</span>
                </span>
                <span>
                  <b>{fmt(food.nutrients.macros.protein_g)}</b>{" "}
                  <span className="text-muted-foreground">g protein</span>
                </span>
                <span className="text-muted-foreground">
                  / {food.referenceQuantity}
                  {food.servingUnit}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1">
                {food.dietTypes.map((d) => (
                  <Badge key={d} variant="outline">
                    {d}
                  </Badge>
                ))}
                {food.source === "user" && (
                  <Badge variant="default">custom</Badge>
                )}
                {overrides[food.id] && <Badge variant="default">edited</Badge>}
                {(() => {
                  const count = recipesForFood(allRecipes, food.id).length;
                  if (count === 0) return null;
                  return (
                    <button
                      className="ml-auto text-xs text-primary hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/recipes?food=${food.id}`);
                      }}
                    >
                      🍲 {count} recipe{count === 1 ? "" : "s"}
                    </button>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-muted-foreground">
            No foods match your filters.
          </p>
        )}
      </div>

      <FoodEditor
        food={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
      />
      <FoodEditor food={null} open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
