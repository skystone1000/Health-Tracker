import { useEffect, useMemo, useState } from "react";
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
import {
  GROUP_KEYS,
  GROUP_LABELS,
  groupFoods,
  type GroupKey,
} from "@/core/grouping";
import { recipesForFood } from "@/core/recipes";
import type { FoodItem } from "@/core/schema";
import { fmt } from "@/lib/format";
import {
  selectAllFoods,
  selectAllRecipes,
  useAppStore,
} from "@/store/useAppStore";
import { FoodEditor } from "./FoodEditor";

const GROUP_BY_STORAGE_KEY = "nourish.foods.groupBy";

/**
 * A UI preference, not user data — so it lives in localStorage directly rather
 * than in the persisted store (which would drag it into the backup format).
 * Storage can throw or be empty in private mode, so every access is guarded.
 */
function readGroupBy(): GroupKey {
  try {
    const raw = localStorage.getItem(GROUP_BY_STORAGE_KEY);
    if (raw && (GROUP_KEYS as readonly string[]).includes(raw)) {
      return raw as GroupKey;
    }
  } catch {
    /* storage unavailable — fall through to the default */
  }
  return "none";
}

function VerifiedBadge({ food }: { food: FoodItem }) {
  if (food.verification.status === "verified")
    return <Badge variant="success">✓ Verified</Badge>;
  if (food.verification.status === "needsReview")
    return <Badge variant="warning">⚠ Needs review</Badge>;
  return <Badge variant="secondary">Unverified</Badge>;
}

function FoodCard({
  food,
  edited,
  recipeCount,
  onOpen,
  onRecipes,
}: {
  food: FoodItem;
  edited: boolean;
  recipeCount: number;
  onOpen: () => void;
  onRecipes: () => void;
}) {
  return (
    <Card
      className="cursor-pointer transition-colors hover:border-primary/40"
      onClick={onOpen}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-semibold leading-tight">{food.name}</div>
            <div className="text-xs text-muted-foreground">{food.category}</div>
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
          {food.itemType === "dish" && <Badge variant="secondary">dish</Badge>}
          {food.source === "user" && <Badge variant="default">custom</Badge>}
          {edited && <Badge variant="default">edited</Badge>}
          {recipeCount > 0 && (
            <button
              className="ml-auto text-xs text-primary hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                onRecipes();
              }}
            >
              🍲 {recipeCount} recipe{recipeCount === 1 ? "" : "s"}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function FoodDatabase() {
  const allFoods = useAppStore(selectAllFoods);
  const allRecipes = useAppStore(selectAllRecipes);
  const overrides = useAppStore((s) => s.foodOverrides);
  const profile = useAppStore((s) => s.profile)!;
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [mealType, setMealType] = useState("");
  const [region, setRegion] = useState("");
  const [respectDiet, setRespectDiet] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupKey>(readGroupBy);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(GROUP_BY_STORAGE_KEY, groupBy);
    } catch {
      /* storage unavailable — the choice just won't persist */
    }
  }, [groupBy]);

  const categories = useMemo(
    () => [...new Set(allFoods.map((f) => f.category))].sort(),
    [allFoods],
  );
  const mealTypes = useMemo(
    () => [...new Set(allFoods.flatMap((f) => f.mealTypes))].sort(),
    [allFoods],
  );
  const regions = useMemo(
    () =>
      [...new Set(allFoods.map((f) => f.region).filter(Boolean))].sort() as string[],
    [allFoods],
  );

  const filtered = useMemo(
    () =>
      applyFilters(allFoods, {
        dietType: respectDiet ? profile.dietType : "nonveg",
        exclusions: respectDiet ? profile.exclusions : [],
        search,
        category: category || undefined,
        mealType: mealType || undefined,
        region: region || undefined,
      }),
    [allFoods, respectDiet, profile, search, category, mealType, region],
  );

  const groups = useMemo(
    () => groupFoods(filtered, groupBy),
    [filtered, groupBy],
  );

  const recipeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const food of filtered) {
      counts.set(food.id, recipesForFood(allRecipes, food.id).length);
    }
    return counts;
  }, [filtered, allRecipes]);

  const toggleGroup = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const renderCard = (food: FoodItem) => (
    <FoodCard
      key={food.id}
      food={food}
      edited={!!overrides[food.id]}
      recipeCount={recipeCounts.get(food.id) ?? 0}
      onOpen={() => setEditing(food)}
      onRecipes={() => navigate(`/recipes?food=${food.id}`)}
    />
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
        {mealTypes.length > 1 && (
          <Select
            className="max-w-[160px]"
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
          >
            <option value="">Any meal</option>
            {mealTypes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        )}
        {regions.length > 1 && (
          <Select
            className="max-w-[170px]"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="">Any region</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        )}
        <Select
          className="max-w-[170px]"
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as GroupKey)}
          aria-label="Group by"
        >
          {GROUP_KEYS.map((k) => (
            <option key={k} value={k}>
              {k === "none" ? "No grouping" : `Group: ${GROUP_LABELS[k]}`}
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

      {filtered.length === 0 && (
        <p className="py-10 text-center text-muted-foreground">
          No foods match your filters.
        </p>
      )}

      {groupBy === "none" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(renderCard)}
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => {
            const isCollapsed = collapsed.has(group.key);
            return (
              <section key={group.key} className="space-y-2">
                <button
                  className="flex w-full items-center gap-2 border-b border-border pb-1 text-left"
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={!isCollapsed}
                >
                  <span className="text-xs text-muted-foreground">
                    {isCollapsed ? "▸" : "▾"}
                  </span>
                  <h2 className="text-lg font-semibold">{group.label}</h2>
                  <Badge variant="secondary">{group.foods.length}</Badge>
                </button>
                {!isCollapsed && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.foods.map(renderCard)}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <FoodEditor
        food={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
      />
      <FoodEditor food={null} open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
