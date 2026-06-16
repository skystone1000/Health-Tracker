import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
} from "@/components/ui";
import {
  ACTIVITY_LEVELS,
  UserProfileSchema,
  WORK_TYPES,
  type UserProfile,
} from "@/core/schema";
import {
  ACTIVITY_LABELS,
  WORK_LABELS,
  WORK_TO_ACTIVITY,
  defaultProfile,
} from "@/lib/profile";
import { defaultFitnessProfile, type FitnessProfile } from "@/core/fitness";
import { FitnessForm } from "@/features/shared/FitnessForm";
import { useAppStore } from "@/store/useAppStore";

const STEPS = [
  "About you",
  "Activity & goal",
  "Diet preferences",
  "Fitness (optional)",
];

export function Onboarding() {
  const existing = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const existingFitness = useAppStore((s) => s.fitness);
  const setFitness = useAppStore((s) => s.setFitness);
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<UserProfile>(existing ?? defaultProfile());
  const [fitnessDraft, setFitnessDraft] = useState<FitnessProfile>(
    existingFitness ?? defaultFitnessProfile(),
  );
  const [exclusionInput, setExclusionInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<UserProfile>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const addExclusion = () => {
    const v = exclusionInput.trim().toLowerCase();
    if (v && !draft.exclusions.includes(v))
      update({ exclusions: [...draft.exclusions, v] });
    setExclusionInput("");
  };

  const finish = () => {
    const parsed = UserProfileSchema.safeParse(draft);
    if (!parsed.success) {
      setError("Please check your entries — some values look invalid.");
      return;
    }
    setProfile(parsed.data);
    setFitness(fitnessDraft);
    navigate("/");
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <div className="mb-2 text-4xl">🌱</div>
        <h1 className="text-2xl font-bold">Welcome to Nourish</h1>
        <p className="text-sm text-muted-foreground">
          A few details so we can personalise your nutrient targets.
        </p>
      </div>

      <div className="mb-4 flex items-center justify-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={
                "grid h-7 w-7 place-items-center rounded-full text-xs font-semibold " +
                (i <= step
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground")
              }
            >
              {i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className="h-px w-8 bg-border" aria-hidden />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
          <CardDescription>Step {step + 1} of {STEPS.length}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <Field label="Name (optional)">
                <Input
                  value={draft.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="e.g. Aditya"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Age">
                  <Input
                    type="number"
                    value={draft.age}
                    onChange={(e) => update({ age: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Sex">
                  <Select
                    value={draft.sex}
                    onChange={(e) =>
                      update({ sex: e.target.value as UserProfile["sex"] })
                    }
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </Select>
                </Field>
                <Field label="Height (cm)">
                  <Input
                    type="number"
                    value={draft.heightCm}
                    onChange={(e) => update({ heightCm: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Weight (kg)">
                  <Input
                    type="number"
                    value={draft.weightKg}
                    onChange={(e) => update({ weightKg: Number(e.target.value) })}
                  />
                </Field>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="What kind of work do you do?">
                <Select
                  value={draft.workType}
                  onChange={(e) => {
                    const workType = e.target.value as UserProfile["workType"];
                    update({
                      workType,
                      activityLevel: WORK_TO_ACTIVITY[workType],
                    });
                  }}
                >
                  {WORK_TYPES.map((w) => (
                    <option key={w} value={w}>
                      {WORK_LABELS[w]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Exercise / activity level">
                <Select
                  value={draft.activityLevel}
                  onChange={(e) =>
                    update({
                      activityLevel: e.target
                        .value as UserProfile["activityLevel"],
                    })
                  }
                >
                  {ACTIVITY_LEVELS.map((a) => (
                    <option key={a} value={a}>
                      {ACTIVITY_LABELS[a]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Goal">
                <div className="grid grid-cols-3 gap-2">
                  {(["lose", "maintain", "gain"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => update({ goal: g })}
                      className={
                        "rounded-lg border px-3 py-2 text-sm capitalize transition-colors " +
                        (draft.goal === g
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-secondary")
                      }
                    >
                      {g} weight
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Diet type">
                <div className="grid grid-cols-3 gap-2">
                  {(["veg", "nonveg", "vegan"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => update({ dietType: d })}
                      className={
                        "rounded-lg border px-3 py-2 text-sm transition-colors " +
                        (draft.dietType === d
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-secondary")
                      }
                    >
                      {d === "nonveg" ? "Non-veg" : d === "veg" ? "Veg" : "Vegan"}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Exclude foods / allergens (optional)">
                <div className="flex gap-2">
                  <Input
                    value={exclusionInput}
                    onChange={(e) => setExclusionInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addExclusion()}
                    placeholder="e.g. peanut, mushroom"
                  />
                  <Button type="button" variant="secondary" onClick={addExclusion}>
                    Add
                  </Button>
                </div>
                {draft.exclusions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {draft.exclusions.map((ex) => (
                      <Badge
                        key={ex}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() =>
                          update({
                            exclusions: draft.exclusions.filter((x) => x !== ex),
                          })
                        }
                      >
                        {ex} ✕
                      </Badge>
                    ))}
                  </div>
                )}
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground">
                Optional — set this up to get a personalised workout plan and yoga
                sequence. You can change it any time. Skip to finish with
                sensible defaults.
              </p>
              <FitnessForm value={fitnessDraft} onChange={setFitnessDraft} />
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <div className="mt-4 flex justify-between">
        <Button
          variant="ghost"
          onClick={() => (step === 0 ? navigate(-1) : setStep(step - 1))}
        >
          ← Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)}>Continue →</Button>
        ) : (
          <Button onClick={finish}>Calculate my plan</Button>
        )}
      </div>
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
