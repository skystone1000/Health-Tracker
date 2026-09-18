import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Input,
  Label,
  Modal,
  Select,
  SourceLink,
} from "@/components/ui";
import {
  FoodItemSchema,
  MACRO_KEYS,
  MINERAL_KEYS,
  NUTRIENT_META,
  VITAMIN_KEYS,
  type DietType,
  type Evidence,
  type FoodItem,
  type NutrientKey,
} from "@/core/schema";
import { toVector, vectorToNutrients } from "@/core/totals";
import { useAppStore } from "@/store/useAppStore";

const slug = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
  `food-${Date.now()}`;

function blankFood(): FoodItem {
  return {
    id: "",
    name: "",
    aliases: [],
    category: "Misc",
    dietTypes: ["veg"],
    allergens: [],
    servingUnit: "g",
    referenceQuantity: 100,
    nutrients: vectorToNutrients({} as never),
    evidences: [],
    verification: { status: "unverified", confidence: "low" },
    source: "user",
    editable: true,
    mealTypes: [],
    itemType: "ingredient",
  };
}

export function FoodEditor({
  food,
  open,
  onClose,
}: {
  food: FoodItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const upsertFood = useAppStore((s) => s.upsertFood);
  const deleteFood = useAppStore((s) => s.deleteFood);
  const resetFood = useAppStore((s) => s.resetFood);
  const overrides = useAppStore((s) => s.foodOverrides);

  const isNew = !food;
  const base = useMemo(() => food ?? blankFood(), [food]);
  const [draft, setDraft] = useState<FoodItem>(base);
  const [vec, setVec] = useState(() => toVector(base.nutrients));
  const [error, setError] = useState<string | null>(null);

  // re-seed when the target food changes
  const [seedId, setSeedId] = useState(base.id);
  if (base.id !== seedId) {
    setSeedId(base.id);
    setDraft(base);
    setVec(toVector(base.nutrients));
    setError(null);
  }

  const isOverridden = !!food && !!overrides[food.id];
  const setField = (patch: Partial<FoodItem>) =>
    setDraft((d) => ({ ...d, ...patch }));
  const setNutrient = (key: NutrientKey, value: number) =>
    setVec((v) => ({ ...v, [key]: value }));

  const toggleDiet = (d: DietType) =>
    setField({
      dietTypes: draft.dietTypes.includes(d)
        ? draft.dietTypes.filter((x) => x !== d)
        : [...draft.dietTypes, d],
    });

  const addEvidence = () =>
    setField({ evidences: [...draft.evidences, { source: "" }] });
  const setEvidence = (i: number, patch: Partial<Evidence>) =>
    setField({
      evidences: draft.evidences.map((e, idx) =>
        idx === i ? { ...e, ...patch } : e,
      ),
    });
  const removeEvidence = (i: number) =>
    setField({ evidences: draft.evidences.filter((_, idx) => idx !== i) });

  const save = () => {
    const evidences = draft.evidences.filter((e) => e.source.trim());
    const verification =
      draft.source === "user"
        ? evidences.length >= 3
          ? { status: "verified" as const, confidence: "medium" as const }
          : { status: "unverified" as const, confidence: "low" as const }
        : draft.verification;

    const candidate: FoodItem = {
      ...draft,
      id: isNew ? slug(draft.name) : draft.id,
      name: draft.name.trim(),
      dietTypes: draft.dietTypes.length ? draft.dietTypes : ["veg"],
      nutrients: vectorToNutrients(vec),
      evidences,
      verification: { ...verification, lastReviewed: new Date().toISOString().slice(0, 10) },
    };

    const parsed = FoodItemSchema.safeParse(candidate);
    if (!parsed.success || !candidate.name) {
      setError("Please give the food a name and valid numeric values.");
      return;
    }
    upsertFood(parsed.data);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? "Add a food" : draft.name || "Edit food"}
      className="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Basics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label>Name</Label>
            <Input
              value={draft.name}
              onChange={(e) => setField({ name: e.target.value })}
              placeholder="e.g. Moong dal (cooked)"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Input
              value={draft.category}
              onChange={(e) => setField({ category: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Per</Label>
              <Input
                type="number"
                value={draft.referenceQuantity}
                onChange={(e) =>
                  setField({ referenceQuantity: Number(e.target.value) || 100 })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select
                value={draft.servingUnit}
                onChange={(e) => setField({ servingUnit: e.target.value })}
              >
                <option value="g">g</option>
                <option value="ml">ml</option>
              </Select>
            </div>
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
          <div className="col-span-2 space-y-1.5">
            <Label>Allergens (comma separated)</Label>
            <Input
              value={draft.allergens.join(", ")}
              onChange={(e) =>
                setField({
                  allergens: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="e.g. peanut, gluten"
            />
          </div>
        </div>

        {/* Nutrient panel */}
        <NutrientGroup
          title="Energy & macronutrients"
          keys={["energy_kcal", ...MACRO_KEYS]}
          vec={vec}
          onChange={setNutrient}
        />
        <NutrientGroup
          title="Vitamins"
          keys={VITAMIN_KEYS}
          vec={vec}
          onChange={setNutrient}
        />
        <NutrientGroup
          title="Minerals"
          keys={MINERAL_KEYS}
          vec={vec}
          onChange={setNutrient}
        />

        {/* Read-only source links — the citations behind the numbers above. */}
        {draft.evidences.some((ev) => ev.source.trim() || ev.url?.trim()) && (
          <div>
            <Label>Sources</Label>
            <ul className="mt-2 space-y-1 rounded-lg bg-secondary/50 p-3 text-sm">
              {draft.evidences.map((ev, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                  <SourceLink url={ev.url}>
                    {ev.source || "Untitled source"}
                    {ev.ref ? ` — ${ev.ref}` : ""}
                  </SourceLink>
                  {ev.value_seen && (
                    <span className="text-xs text-muted-foreground">
                      ({ev.value_seen})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Evidences */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label>Evidence sources</Label>
            <Badge variant={draft.evidences.length >= 3 ? "success" : "warning"}>
              {draft.evidences.length} source
              {draft.evidences.length === 1 ? "" : "s"} · ≥3 to verify, ≥2 to ship
            </Badge>
          </div>
          <div className="space-y-2">
            {draft.evidences.map((ev, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-2 rounded-lg border border-border p-2 sm:grid-cols-2"
              >
                <Input
                  value={ev.source}
                  onChange={(e) => setEvidence(i, { source: e.target.value })}
                  placeholder="Source (e.g. USDA FoodData Central)"
                />
                <Input
                  value={ev.ref ?? ""}
                  onChange={(e) => setEvidence(i, { ref: e.target.value })}
                  placeholder="Reference / ID"
                />
                <Input
                  value={ev.value_seen ?? ""}
                  onChange={(e) =>
                    setEvidence(i, { value_seen: e.target.value })
                  }
                  placeholder="Value seen (e.g. 121 kcal/100g)"
                />
                <div className="flex gap-2">
                  <Input
                    value={ev.url ?? ""}
                    onChange={(e) => setEvidence(i, { url: e.target.value })}
                    placeholder="URL"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEvidence(i)}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={addEvidence}
          >
            + Add source
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
          <div>
            {!isNew && draft.source === "user" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  deleteFood(draft.id);
                  onClose();
                }}
              >
                Delete
              </Button>
            )}
            {!isNew && isOverridden && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  resetFood(draft.id);
                  onClose();
                }}
              >
                Reset to default
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save}>Save food</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function NutrientGroup({
  title,
  keys,
  vec,
  onChange,
}: {
  title: string;
  keys: readonly NutrientKey[];
  vec: Record<NutrientKey, number>;
  onChange: (key: NutrientKey, value: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {keys.map((key) => (
          <div key={key} className="space-y-1">
            <label className="text-xs text-muted-foreground">
              {NUTRIENT_META[key].label} ({NUTRIENT_META[key].unit})
            </label>
            <Input
              type="number"
              value={vec[key] ?? 0}
              onChange={(e) => onChange(key, Number(e.target.value) || 0)}
              className="h-9"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
