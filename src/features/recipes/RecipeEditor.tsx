import { useMemo, useState } from "react";
import { Button, Input, Label, Modal, Select } from "@/components/ui";
import {
  RecipeSchema,
  type DietType,
  type FoodItem,
  type Recipe,
} from "@/core/schema";
import { useAppStore } from "@/store/useAppStore";

const slug = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
  `recipe-${Date.now()}`;

function blankRecipe(): Recipe {
  return {
    id: "",
    name: "",
    cuisine: "Indian",
    dietTypes: ["veg"],
    baseFoodIds: [],
    servings: 1,
    ingredients: [],
    steps: [],
    source: "user",
  };
}

export function RecipeEditor({
  recipe,
  foods,
  open,
  onClose,
}: {
  recipe: Recipe | null;
  foods: FoodItem[];
  open: boolean;
  onClose: () => void;
}) {
  const upsertRecipe = useAppStore((s) => s.upsertRecipe);
  const isNew = !recipe;
  const base = useMemo(() => recipe ?? blankRecipe(), [recipe]);
  const [draft, setDraft] = useState<Recipe>(base);
  const [stepsText, setStepsText] = useState(base.steps.join("\n"));
  const [error, setError] = useState<string | null>(null);

  const [seedId, setSeedId] = useState(base.id);
  if (base.id !== seedId) {
    setSeedId(base.id);
    setDraft(base);
    setStepsText(base.steps.join("\n"));
    setError(null);
  }

  const set = (patch: Partial<Recipe>) => setDraft((d) => ({ ...d, ...patch }));
  const toggleDiet = (d: DietType) =>
    set({
      dietTypes: draft.dietTypes.includes(d)
        ? draft.dietTypes.filter((x) => x !== d)
        : [...draft.dietTypes, d],
    });

  const addIngredient = () =>
    set({
      ingredients: [
        ...draft.ingredients,
        { foodId: foods[0]?.id ?? "", quantity: 100 },
      ],
    });
  const setIngredient = (i: number, patch: Partial<Recipe["ingredients"][0]>) =>
    set({
      ingredients: draft.ingredients.map((ing, idx) =>
        idx === i ? { ...ing, ...patch } : ing,
      ),
    });
  const removeIngredient = (i: number) =>
    set({ ingredients: draft.ingredients.filter((_, idx) => idx !== i) });

  const save = () => {
    const steps = stepsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const ingredients = draft.ingredients.filter((i) => i.foodId);
    const candidate: Recipe = {
      ...draft,
      id: isNew ? slug(draft.name) : draft.id,
      name: draft.name.trim(),
      dietTypes: draft.dietTypes.length ? draft.dietTypes : ["veg"],
      baseFoodIds: [...new Set(ingredients.map((i) => i.foodId))],
      ingredients,
      steps,
      source: "user",
    };
    const parsed = RecipeSchema.safeParse(candidate);
    if (!parsed.success || !candidate.name) {
      setError("Add a name and at least one ingredient.");
      return;
    }
    upsertRecipe(parsed.data);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? "Add a recipe" : `Edit ${draft.name}`}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label>Name</Label>
            <Input
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="e.g. Masoor Dal"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cuisine</Label>
            <Input
              value={draft.cuisine}
              onChange={(e) => set({ cuisine: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Servings</Label>
            <Input
              type="number"
              value={draft.servings}
              onChange={(e) => set({ servings: Number(e.target.value) || 1 })}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Diet types</Label>
            <div className="flex gap-2">
              {(["veg", "nonveg", "vegan"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDiet(d)}
                  className={
                    "rounded-lg border px-3 py-1.5 text-sm transition-colors " +
                    (draft.dietTypes.includes(d)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-secondary")
                  }
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <Label>Ingredients</Label>
          <div className="mt-1.5 space-y-2">
            {draft.ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2">
                <Select
                  className="flex-1"
                  value={ing.foodId}
                  onChange={(e) => setIngredient(i, { foodId: e.target.value })}
                >
                  {foods.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  className="w-24"
                  value={ing.quantity}
                  onChange={(e) =>
                    setIngredient(i, { quantity: Number(e.target.value) || 0 })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeIngredient(i)}
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={addIngredient}
          >
            + Add ingredient
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label>Method (one step per line)</Label>
          <textarea
            value={stepsText}
            onChange={(e) => setStepsText(e.target.value)}
            rows={4}
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={"Boil the dal…\nPrepare the tadka…"}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save recipe</Button>
        </div>
      </div>
    </Modal>
  );
}
