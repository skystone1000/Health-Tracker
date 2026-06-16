import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, CardContent, Input, Select } from "@/components/ui";
import { applyExerciseFilters } from "@/core/exercise/filters";
import {
  BODY_REGIONS,
  EQUIPMENT,
  MUSCLE_GROUPS,
  type BodyRegion,
  type Equipment,
  type Exercise,
  type MuscleGroup,
} from "@/core/exercise/schema";
import {
  DIFFICULTY_LABELS,
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
  REGION_LABELS,
} from "@/lib/activity";
import { selectAllExercises, useAppStore } from "@/store/useAppStore";
import { ExerciseEditor } from "./ExerciseEditor";

export function ExerciseLibrary() {
  const allExercises = useAppStore(selectAllExercises);
  const overrides = useAppStore((s) => s.exerciseOverrides);

  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("");
  const [region, setRegion] = useState("");
  const [equipment, setEquipment] = useState("");
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(
    () =>
      applyExerciseFilters(allExercises, {
        search,
        muscle: (muscle || undefined) as MuscleGroup | undefined,
        region: (region || undefined) as BodyRegion | undefined,
        equipment: (equipment || undefined) as Equipment | undefined,
      }),
    [allExercises, search, muscle, region, equipment],
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">🏋 Exercise</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} exercises across upper, lower, core & cardio · tap
            any to view technique
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/exercise/plan">
            <Button variant="secondary">My workout plan →</Button>
          </Link>
          <Button onClick={() => setAdding(true)}>+ Add</Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-xs"
          placeholder="Search exercises…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          className="max-w-[160px]"
          value={muscle}
          onChange={(e) => setMuscle(e.target.value)}
        >
          <option value="">All muscles</option>
          {MUSCLE_GROUPS.map((m) => (
            <option key={m} value={m}>
              {MUSCLE_LABELS[m]}
            </option>
          ))}
        </Select>
        <Select
          className="max-w-[150px]"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        >
          <option value="">All regions</option>
          {BODY_REGIONS.map((r) => (
            <option key={r} value={r}>
              {REGION_LABELS[r]}
            </option>
          ))}
        </Select>
        <Select
          className="max-w-[160px]"
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
        >
          <option value="">All equipment</option>
          {EQUIPMENT.map((eq) => (
            <option key={eq} value={eq}>
              {EQUIPMENT_LABELS[eq]}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((ex) => (
          <Card
            key={ex.id}
            className="cursor-pointer transition-colors hover:border-primary/40"
            onClick={() => setEditing(ex)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold leading-tight">{ex.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {REGION_LABELS[ex.region]} · {DIFFICULTY_LABELS[ex.difficulty]}
                  </div>
                </div>
                {ex.verification.status === "verified" ? (
                  <Badge variant="success">✓</Badge>
                ) : null}
              </div>
              <div className="mt-3 text-sm">
                <b>{ex.metValue}</b>{" "}
                <span className="text-muted-foreground">MET</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1">
                {ex.primaryMuscles.map((m) => (
                  <Badge key={m} variant="outline">
                    {MUSCLE_LABELS[m]}
                  </Badge>
                ))}
                {ex.source === "user" && <Badge variant="default">custom</Badge>}
                {overrides[ex.id] && <Badge variant="default">edited</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-muted-foreground">
            No exercises match your filters.
          </p>
        )}
      </div>

      <ExerciseEditor
        exercise={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
      />
      <ExerciseEditor
        exercise={null}
        open={adding}
        onClose={() => setAdding(false)}
      />
    </div>
  );
}
