import { useMemo, useState } from "react";
import { Badge, Input, Modal } from "@/components/ui";
import { applyFilters } from "@/core/filters";
import type { FoodItem, UserProfile } from "@/core/schema";
import { fmt } from "@/lib/format";

/** Modal list of diet-filtered foods; clicking one adds it to a meal. */
export function FoodPicker({
  open,
  onClose,
  foods,
  profile,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  foods: FoodItem[];
  profile: UserProfile;
  onPick: (food: FoodItem) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () =>
      applyFilters(foods, {
        dietType: profile.dietType,
        exclusions: profile.exclusions,
        search,
      }),
    [foods, profile, search],
  );

  return (
    <Modal open={open} onClose={onClose} title="Add a food" className="max-w-lg">
      <Input
        autoFocus
        placeholder="Search foods…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="mt-3 max-h-[50vh] space-y-1 overflow-y-auto">
        {filtered.map((food) => (
          <button
            key={food.id}
            onClick={() => {
              onPick(food);
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-secondary"
          >
            <div>
              <div className="text-sm font-medium">{food.name}</div>
              <div className="text-xs text-muted-foreground">
                {food.category}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{fmt(food.nutrients.energy_kcal)} kcal</span>
              {food.verification.status === "verified" && (
                <Badge variant="success">✓</Badge>
              )}
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No foods match.
          </p>
        )}
      </div>
    </Modal>
  );
}
