import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { generateRoutine } from "@/core/exercise/routine-engine";
import { dayEstimatedKcal, dayVolume } from "@/core/exercise/volume";
import type { WorkoutDay, WorkoutRoutine } from "@/core/exercise/schema";
import { defaultFitnessProfile, type FitnessProfile } from "@/core/fitness";
import { FitnessForm } from "@/features/shared/FitnessForm";
import { ActivityHistory } from "@/features/shared/ActivityHistory";
import { fmt } from "@/lib/format";
import { todayStr } from "@/lib/activity";
import {
  selectExercisesById,
  selectAllExercises,
  useAppStore,
} from "@/store/useAppStore";

export function WorkoutPlan() {
  const profile = useAppStore((s) => s.profile)!;
  const fitness = useAppStore((s) => s.fitness);
  const setFitness = useAppStore((s) => s.setFitness);
  const exercises = useAppStore(selectAllExercises);
  const exercisesById = useAppStore(selectExercisesById);
  const routines = useAppStore((s) => s.workoutRoutines);
  const saveRoutine = useAppStore((s) => s.saveRoutine);
  const logActivity = useAppStore((s) => s.logActivity);

  const [draftFitness, setDraftFitness] = useState<FitnessProfile>(
    fitness ?? defaultFitnessProfile(),
  );
  const [setupOpen, setSetupOpen] = useState(!fitness);

  const routine: WorkoutRoutine | undefined = useMemo(() => {
    if (!fitness) return undefined;
    const id = `routine-${fitness.splitPreference}-${fitness.daysPerWeek}-${fitness.goal}`;
    return routines.find((r) => r.id === id);
  }, [fitness, routines]);

  const weightKg = profile.weightKg;

  const saveFitnessAndGenerate = () => {
    setFitness(draftFitness);
    saveRoutine(generateRoutine(draftFitness, exercises));
    setSetupOpen(false);
  };

  const regenerate = () => {
    if (!fitness) return;
    saveRoutine(generateRoutine(fitness, exercises));
  };

  const logDay = (day: WorkoutDay) => {
    const vol = dayVolume(day);
    const kcal = dayEstimatedKcal(day, exercisesById, weightKg);
    logActivity({
      id: `act-${Date.now()}`,
      date: todayStr(),
      kind: "exercise",
      refId: routine?.id ?? "workout",
      label: day.label,
      durationMin: vol.estimatedMinutes,
      estimatedKcal: kcal,
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">My workout plan</h1>
        <p className="text-sm text-muted-foreground">
          A routine tailored to your equipment, experience and goal.
        </p>
      </header>

      {setupOpen || !fitness ? (
        <Card>
          <CardHeader>
            <CardTitle>Set up your training</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FitnessForm
              value={draftFitness}
              onChange={setDraftFitness}
              section="exercise"
            />
            <div className="flex justify-end gap-2">
              {fitness && (
                <Button variant="ghost" onClick={() => setSetupOpen(false)}>
                  Cancel
                </Button>
              )}
              <Button onClick={saveFitnessAndGenerate}>
                Generate my routine
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{routine?.name ?? "Your routine"}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {fitness.daysPerWeek}×/week · {fitness.equipment.length} equipment
                type(s)
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSetupOpen(true)}>
                Edit setup
              </Button>
              <Button variant="secondary" size="sm" onClick={regenerate}>
                Regenerate
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {routine?.days.map((day, i) => {
        const vol = dayVolume(day);
        const kcal = dayEstimatedKcal(day, exercisesById, weightKg);
        return (
          <Card key={i}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">{day.label}</CardTitle>
              <Badge variant="secondary">
                {vol.totalSets} sets · ~{fmt(kcal)} kcal
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {day.items.map((item, j) => {
                const ex = exercisesById.get(item.exerciseId);
                if (!ex) return null;
                const reps = item.sets[0]?.reps;
                return (
                  <div
                    key={j}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{ex.name}</span>
                    <span className="text-muted-foreground">
                      {item.sets.length} × {reps ?? "—"}
                    </span>
                  </div>
                );
              })}
              {day.items.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No exercises matched your equipment — add equipment or custom
                  exercises.
                </p>
              )}
              <div className="flex justify-end pt-1">
                <Button size="sm" onClick={() => logDay(day)}>
                  ✓ Log this session
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <ActivityHistory kind="exercise" />
    </div>
  );
}
