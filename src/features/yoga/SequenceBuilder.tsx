import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { generateSequence } from "@/core/yoga/sequence-engine";
import { sequenceEstimatedKcal, sequenceTotals } from "@/core/yoga/duration";
import type { Sequence } from "@/core/yoga/schema";
import { defaultFitnessProfile, type FitnessProfile } from "@/core/fitness";
import { FitnessForm } from "@/features/shared/FitnessForm";
import { ActivityHistory } from "@/features/shared/ActivityHistory";
import { FAMILY_LABELS } from "@/lib/activity";
import { fmt } from "@/lib/format";
import { todayStr } from "@/lib/activity";
import { selectAllAsanas, selectAsanasById, useAppStore } from "@/store/useAppStore";

export function SequenceBuilder() {
  const profile = useAppStore((s) => s.profile)!;
  const fitness = useAppStore((s) => s.fitness);
  const setFitness = useAppStore((s) => s.setFitness);
  const asanas = useAppStore(selectAllAsanas);
  const asanasById = useAppStore(selectAsanasById);
  const sequences = useAppStore((s) => s.yogaSequences);
  const saveSequence = useAppStore((s) => s.saveSequence);
  const logActivity = useAppStore((s) => s.logActivity);

  const [draftFitness, setDraftFitness] = useState<FitnessProfile>(
    fitness ?? defaultFitnessProfile(),
  );
  const [setupOpen, setSetupOpen] = useState(!fitness);

  const sequence: Sequence | undefined = useMemo(() => {
    if (!fitness) return undefined;
    const id = `sequence-${fitness.yogaGoal}-${fitness.yogaLevel}`;
    return sequences.find((s) => s.id === id);
  }, [fitness, sequences]);

  const weightKg = profile.weightKg;

  const saveAndGenerate = () => {
    setFitness(draftFitness);
    saveSequence(generateSequence(draftFitness, asanas));
    setSetupOpen(false);
  };

  const regenerate = () => {
    if (!fitness) return;
    saveSequence(generateSequence(fitness, asanas));
  };

  const logSequence = () => {
    if (!sequence) return;
    const totals = sequenceTotals(sequence);
    const kcal = sequenceEstimatedKcal(sequence, asanasById, weightKg);
    logActivity({
      id: `act-${Date.now()}`,
      date: todayStr(),
      kind: "yoga",
      refId: sequence.id,
      label: sequence.name,
      durationMin: Math.round(totals.totalMin),
      estimatedKcal: kcal,
    });
  };

  const totals = sequence ? sequenceTotals(sequence) : null;
  const kcal = sequence
    ? sequenceEstimatedKcal(sequence, asanasById, weightKg)
    : 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">My yoga sequence</h1>
        <p className="text-sm text-muted-foreground">
          A guided flow built for your goal and level — sequenced safely from
          breath to rest.
        </p>
      </header>

      {setupOpen || !fitness ? (
        <Card>
          <CardHeader>
            <CardTitle>Set up your practice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FitnessForm
              value={draftFitness}
              onChange={setDraftFitness}
              section="yoga"
            />
            <div className="flex justify-end gap-2">
              {fitness && (
                <Button variant="ghost" onClick={() => setSetupOpen(false)}>
                  Cancel
                </Button>
              )}
              <Button onClick={saveAndGenerate}>Generate my sequence</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{sequence?.name ?? "Your sequence"}</CardTitle>
              {totals && (
                <p className="text-sm text-muted-foreground">
                  {totals.poses} poses · ~{fmt(totals.totalMin)} min · ~
                  {fmt(kcal)} kcal
                </p>
              )}
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

      {sequence && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">The flow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sequence.poses.map((pose, i) => {
              const a = asanasById.get(pose.asanaId);
              if (!a) return null;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span>
                    <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                    <span className="font-medium">{a.englishName}</span>{" "}
                    <span className="italic text-muted-foreground">
                      {a.sanskritName}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Badge variant="outline">{FAMILY_LABELS[a.family]}</Badge>
                    {pose.holdSec}s
                  </span>
                </div>
              );
            })}
            {sequence.poses.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No asanas matched your level and limitations — try a higher level
                or remove a limitation.
              </p>
            )}
            <div className="flex justify-end pt-1">
              <Button size="sm" onClick={logSequence}>
                ✓ Log this practice
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ActivityHistory kind="yoga" />
    </div>
  );
}
