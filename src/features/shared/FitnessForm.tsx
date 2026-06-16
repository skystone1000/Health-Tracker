import { useState } from "react";
import { Badge, Button, Input, Label, Select } from "@/components/ui";
import { DIFFICULTIES } from "@/core/activity/schema";
import { EQUIPMENT, SPLIT_TYPES } from "@/core/exercise/schema";
import { FITNESS_GOALS, YOGA_GOALS, type FitnessProfile } from "@/core/fitness";
import {
  DIFFICULTY_LABELS,
  EQUIPMENT_LABELS,
  GOAL_LABELS,
  SPLIT_LABELS,
  YOGA_GOAL_LABELS,
} from "@/lib/activity";

/**
 * Controlled editor for the user's {@link FitnessProfile}. Reused by onboarding
 * (step 4) and the workout/yoga plan builders — one definition, no duplication.
 */
export function FitnessForm({
  value,
  onChange,
  section = "both",
}: {
  value: FitnessProfile;
  onChange: (next: FitnessProfile) => void;
  section?: "exercise" | "yoga" | "both";
}) {
  const [limitInput, setLimitInput] = useState("");
  const update = (patch: Partial<FitnessProfile>) =>
    onChange({ ...value, ...patch });

  const toggleEquipment = (eq: FitnessProfile["equipment"][number]) => {
    const has = value.equipment.includes(eq);
    const next = has
      ? value.equipment.filter((e) => e !== eq)
      : [...value.equipment, eq];
    update({ equipment: next.length ? next : ["bodyweight"] });
  };

  const addLimitation = () => {
    const v = limitInput.trim().toLowerCase();
    if (v && !value.limitations.includes(v))
      update({ limitations: [...value.limitations, v] });
    setLimitInput("");
  };

  return (
    <div className="space-y-4">
      {(section === "exercise" || section === "both") && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Experience">
              <Select
                value={value.experience}
                onChange={(e) =>
                  update({
                    experience: e.target.value as FitnessProfile["experience"],
                  })
                }
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {DIFFICULTY_LABELS[d]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Days per week">
              <Input
                type="number"
                min={1}
                max={7}
                value={value.daysPerWeek}
                onChange={(e) =>
                  update({
                    daysPerWeek: Math.min(
                      7,
                      Math.max(1, Number(e.target.value) || 1),
                    ),
                  })
                }
              />
            </Field>
            <Field label="Training goal">
              <Select
                value={value.goal}
                onChange={(e) =>
                  update({ goal: e.target.value as FitnessProfile["goal"] })
                }
              >
                {FITNESS_GOALS.map((g) => (
                  <option key={g} value={g}>
                    {GOAL_LABELS[g]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Split preference">
              <Select
                value={value.splitPreference}
                onChange={(e) =>
                  update({
                    splitPreference: e.target
                      .value as FitnessProfile["splitPreference"],
                  })
                }
              >
                {SPLIT_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {SPLIT_LABELS[s]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Available equipment">
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT.map((eq) => {
                const active = value.equipment.includes(eq);
                return (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => toggleEquipment(eq)}
                    className={
                      "rounded-lg border px-3 py-1.5 text-sm transition-colors " +
                      (active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-secondary")
                    }
                  >
                    {EQUIPMENT_LABELS[eq]}
                  </button>
                );
              })}
            </div>
          </Field>
        </>
      )}

      {(section === "yoga" || section === "both") && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Yoga goal">
            <Select
              value={value.yogaGoal}
              onChange={(e) =>
                update({ yogaGoal: e.target.value as FitnessProfile["yogaGoal"] })
              }
            >
              {YOGA_GOALS.map((g) => (
                <option key={g} value={g}>
                  {YOGA_GOAL_LABELS[g]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Yoga level">
            <Select
              value={value.yogaLevel}
              onChange={(e) =>
                update({
                  yogaLevel: e.target.value as FitnessProfile["yogaLevel"],
                })
              }
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABELS[d]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}

      <Field label="Injuries / limitations (optional)">
        <div className="flex gap-2">
          <Input
            value={limitInput}
            onChange={(e) => setLimitInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addLimitation()}
            placeholder="e.g. knee, lower-back, pregnancy"
          />
          <Button type="button" variant="secondary" onClick={addLimitation}>
            Add
          </Button>
        </div>
        {value.limitations.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {value.limitations.map((l) => (
              <Badge
                key={l}
                variant="secondary"
                className="cursor-pointer"
                onClick={() =>
                  update({
                    limitations: value.limitations.filter((x) => x !== l),
                  })
                }
              >
                {l} ✕
              </Badge>
            ))}
          </div>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Used to skip risky movements and contraindicated asanas.
        </p>
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
