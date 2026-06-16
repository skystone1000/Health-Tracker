import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Input,
  Label,
  Modal,
  Select,
} from "@/components/ui";
import { DIFFICULTIES } from "@/core/activity/schema";
import {
  BODY_REGIONS,
  EQUIPMENT,
  ExerciseSchema,
  MUSCLE_GROUPS,
  type Exercise,
} from "@/core/exercise/schema";
import {
  DIFFICULTY_LABELS,
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
  REGION_LABELS,
} from "@/lib/activity";
import { useAppStore } from "@/store/useAppStore";

interface Draft {
  id: string;
  name: string;
  primaryMuscles: Exercise["primaryMuscles"];
  region: Exercise["region"];
  equipment: Exercise["equipment"];
  difficulty: Exercise["difficulty"];
  metValue: number;
  instructions: string;
}

const slug = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function toDraft(ex: Exercise | null): Draft {
  return {
    id: ex?.id ?? "",
    name: ex?.name ?? "",
    primaryMuscles: ex?.primaryMuscles ?? ["chest"],
    region: ex?.region ?? "upper",
    equipment: ex?.equipment ?? ["bodyweight"],
    difficulty: ex?.difficulty ?? "beginner",
    metValue: ex?.metValue ?? 4,
    instructions: ex?.instructions.join("\n") ?? "",
  };
}

export function ExerciseEditor({
  exercise,
  open,
  onClose,
}: {
  exercise: Exercise | null;
  open: boolean;
  onClose: () => void;
}) {
  const upsertExercise = useAppStore((s) => s.upsertExercise);
  const deleteExercise = useAppStore((s) => s.deleteExercise);
  const resetExercise = useAppStore((s) => s.resetExercise);
  const overrides = useAppStore((s) => s.exerciseOverrides);

  const isNew = !exercise;
  const [editing, setEditing] = useState(isNew);
  const [draft, setDraft] = useState<Draft>(toDraft(exercise));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(toDraft(exercise));
    setEditing(!exercise);
    setError(null);
  }, [exercise, open]);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const toggle = <K extends "primaryMuscles" | "equipment">(
    key: K,
    val: Draft[K][number],
  ) => {
    const list = draft[key] as string[];
    const has = list.includes(val);
    const next = has ? list.filter((x) => x !== val) : [...list, val];
    set({ [key]: next.length ? next : list } as unknown as Partial<Draft>);
  };

  const save = () => {
    const id = draft.id || slug(draft.name);
    if (!id) {
      setError("Please give the exercise a name.");
      return;
    }
    const instructions = draft.instructions
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const evidences = exercise?.evidences ?? [];
    const candidate = {
      ...(exercise ?? {}),
      id,
      name: draft.name,
      primaryMuscles: draft.primaryMuscles,
      secondaryMuscles: exercise?.secondaryMuscles ?? [],
      region: draft.region,
      equipment: draft.equipment,
      difficulty: draft.difficulty,
      metValue: Number(draft.metValue),
      instructions,
      evidences,
      verification: exercise?.verification ?? {
        status: evidences.length >= 3 ? "verified" : "unverified",
        confidence: evidences.length >= 3 ? "high" : "low",
      },
      // new exercises are custom; editing a default stores an override
      source: exercise?.source ?? "user",
    };
    const parsed = ExerciseSchema.safeParse(candidate);
    if (!parsed.success) {
      setError("Some values look invalid — check muscles, equipment and MET.");
      return;
    }
    upsertExercise(parsed.data);
    onClose();
  };

  const isOverridden = exercise ? !!overrides[exercise.id] : false;
  const isCustom = exercise?.source === "user";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? "Add exercise" : exercise!.name}
      description={
        isNew
          ? "Create a custom exercise."
          : `${REGION_LABELS[exercise!.region]} · ${DIFFICULTY_LABELS[exercise!.difficulty]}`
      }
    >
      {!editing && exercise ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1">
            {exercise.primaryMuscles.map((m) => (
              <Badge key={m} variant="default">
                {MUSCLE_LABELS[m]}
              </Badge>
            ))}
            {exercise.equipment.map((e) => (
              <Badge key={e} variant="outline">
                {EQUIPMENT_LABELS[e]}
              </Badge>
            ))}
          </div>
          <div className="text-sm">
            <b>{exercise.metValue}</b>{" "}
            <span className="text-muted-foreground">MET intensity</span>
          </div>
          {exercise.instructions.length > 0 && (
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {exercise.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
          {exercise.evidences.length > 0 && (
            <div>
              <Label>Evidence</Label>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {exercise.evidences.map((ev, i) => (
                  <li key={i}>
                    {ev.source}
                    {ev.ref ? ` — ${ev.ref}` : ""}
                    {ev.value_seen ? ` (${ev.value_seen})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-end gap-2">
            {isOverridden && (
              <Button
                variant="ghost"
                onClick={() => {
                  resetExercise(exercise.id);
                  onClose();
                }}
              >
                Reset to default
              </Button>
            )}
            {isCustom && (
              <Button
                variant="destructive"
                onClick={() => {
                  deleteExercise(exercise.id);
                  onClose();
                }}
              >
                Delete
              </Button>
            )}
            <Button onClick={() => setEditing(true)}>Edit</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="e.g. Incline Push-up"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Region</Label>
              <Select
                value={draft.region}
                onChange={(e) =>
                  set({ region: e.target.value as Draft["region"] })
                }
              >
                {BODY_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {REGION_LABELS[r]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Select
                value={draft.difficulty}
                onChange={(e) =>
                  set({ difficulty: e.target.value as Draft["difficulty"] })
                }
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {DIFFICULTY_LABELS[d]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>MET intensity</Label>
            <Input
              type="number"
              step="0.1"
              value={draft.metValue}
              onChange={(e) => set({ metValue: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Primary muscles</Label>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUPS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggle("primaryMuscles", m)}
                  className={
                    "rounded-lg border px-2.5 py-1 text-xs transition-colors " +
                    (draft.primaryMuscles.includes(m)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-secondary")
                  }
                >
                  {MUSCLE_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Equipment</Label>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT.map((eq) => (
                <button
                  key={eq}
                  type="button"
                  onClick={() => toggle("equipment", eq)}
                  className={
                    "rounded-lg border px-2.5 py-1 text-xs transition-colors " +
                    (draft.equipment.includes(eq)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-secondary")
                  }
                >
                  {EQUIPMENT_LABELS[eq]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Instructions (one step per line)</Label>
            <textarea
              className="flex min-h-[96px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={draft.instructions}
              onChange={(e) => set({ instructions: e.target.value })}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
