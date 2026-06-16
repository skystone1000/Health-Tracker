import { useEffect, useState } from "react";
import { Badge, Button, Input, Label, Modal, Select } from "@/components/ui";
import { DIFFICULTIES } from "@/core/activity/schema";
import {
  ASANA_FAMILIES,
  AsanaSchema,
  YOGA_FOCI,
  type Asana,
} from "@/core/yoga/schema";
import { DIFFICULTY_LABELS, FAMILY_LABELS, FOCUS_LABELS } from "@/lib/activity";
import { useAppStore } from "@/store/useAppStore";

interface Draft {
  id: string;
  sanskritName: string;
  englishName: string;
  family: Asana["family"];
  difficulty: Asana["difficulty"];
  metValue: number;
  focus: Asana["focus"];
  defaultHoldSec: number;
  steps: string;
  benefits: string;
  contraindications: string;
}

const slug = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const lines = (s: string) =>
  s.split("\n").map((l) => l.trim()).filter(Boolean);

function toDraft(a: Asana | null): Draft {
  return {
    id: a?.id ?? "",
    sanskritName: a?.sanskritName ?? "",
    englishName: a?.englishName ?? "",
    family: a?.family ?? "standing",
    difficulty: a?.difficulty ?? "beginner",
    metValue: a?.metValue ?? 2.5,
    focus: a?.focus ?? ["flexibility"],
    defaultHoldSec: a?.defaultHoldSec ?? 30,
    steps: a?.steps.join("\n") ?? "",
    benefits: a?.benefits.join("\n") ?? "",
    contraindications: a?.contraindications.join("\n") ?? "",
  };
}

export function AsanaEditor({
  asana,
  open,
  onClose,
}: {
  asana: Asana | null;
  open: boolean;
  onClose: () => void;
}) {
  const upsertAsana = useAppStore((s) => s.upsertAsana);
  const deleteAsana = useAppStore((s) => s.deleteAsana);
  const resetAsana = useAppStore((s) => s.resetAsana);
  const overrides = useAppStore((s) => s.asanaOverrides);

  const isNew = !asana;
  const [editing, setEditing] = useState(isNew);
  const [draft, setDraft] = useState<Draft>(toDraft(asana));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(toDraft(asana));
    setEditing(!asana);
    setError(null);
  }, [asana, open]);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const toggleFocus = (f: Asana["focus"][number]) => {
    const has = draft.focus.includes(f);
    const next = has ? draft.focus.filter((x) => x !== f) : [...draft.focus, f];
    set({ focus: next.length ? next : draft.focus });
  };

  const save = () => {
    const id = draft.id || slug(draft.englishName || draft.sanskritName);
    if (!id) {
      setError("Please give the asana a name.");
      return;
    }
    const evidences = asana?.evidences ?? [];
    const candidate = {
      ...(asana ?? {}),
      id,
      sanskritName: draft.sanskritName,
      englishName: draft.englishName,
      family: draft.family,
      difficulty: draft.difficulty,
      metValue: Number(draft.metValue),
      focus: draft.focus,
      defaultHoldSec: Number(draft.defaultHoldSec) || 30,
      steps: lines(draft.steps),
      benefits: lines(draft.benefits),
      contraindications: lines(draft.contraindications),
      evidences,
      verification: asana?.verification ?? {
        status: evidences.length >= 3 ? "verified" : "unverified",
        confidence: evidences.length >= 3 ? "high" : "low",
      },
      source: asana?.source ?? "user",
    };
    const parsed = AsanaSchema.safeParse(candidate);
    if (!parsed.success) {
      setError("Some values look invalid — check the focus and hold time.");
      return;
    }
    upsertAsana(parsed.data);
    onClose();
  };

  const isOverridden = asana ? !!overrides[asana.id] : false;
  const isCustom = asana?.source === "user";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? "Add asana" : `${asana!.englishName}`}
      description={
        isNew
          ? "Create a custom asana."
          : `${asana!.sanskritName} · ${FAMILY_LABELS[asana!.family]}`
      }
    >
      {!editing && asana ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1">
            <Badge variant="default">{FAMILY_LABELS[asana.family]}</Badge>
            <Badge variant="outline">
              {DIFFICULTY_LABELS[asana.difficulty]}
            </Badge>
            {asana.focus.map((f) => (
              <Badge key={f} variant="secondary">
                {FOCUS_LABELS[f]}
              </Badge>
            ))}
          </div>
          {asana.steps.length > 0 && (
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {asana.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
          {asana.benefits.length > 0 && (
            <div className="text-sm">
              <Label>Benefits</Label>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {asana.benefits.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}
          {asana.contraindications.length > 0 && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              ⚠ Avoid with: {asana.contraindications.join(", ")}
            </p>
          )}
          <div className="flex justify-end gap-2">
            {isOverridden && (
              <Button
                variant="ghost"
                onClick={() => {
                  resetAsana(asana.id);
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
                  deleteAsana(asana.id);
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Sanskrit name</Label>
              <Input
                value={draft.sanskritName}
                onChange={(e) => set({ sanskritName: e.target.value })}
                placeholder="e.g. Tadasana"
              />
            </div>
            <div className="space-y-1.5">
              <Label>English name</Label>
              <Input
                value={draft.englishName}
                onChange={(e) => set({ englishName: e.target.value })}
                placeholder="e.g. Mountain Pose"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Family</Label>
              <Select
                value={draft.family}
                onChange={(e) =>
                  set({ family: e.target.value as Draft["family"] })
                }
              >
                {ASANA_FAMILIES.map((f) => (
                  <option key={f} value={f}>
                    {FAMILY_LABELS[f]}
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
              <Label>Default hold (sec)</Label>
              <Input
                type="number"
                value={draft.defaultHoldSec}
                onChange={(e) =>
                  set({ defaultHoldSec: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Focus</Label>
            <div className="flex flex-wrap gap-1.5">
              {YOGA_FOCI.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFocus(f)}
                  className={
                    "rounded-lg border px-2.5 py-1 text-xs transition-colors " +
                    (draft.focus.includes(f)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-secondary")
                  }
                >
                  {FOCUS_LABELS[f]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Steps (one per line)</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={draft.steps}
              onChange={(e) => set({ steps: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Contraindications (one per line)</Label>
            <textarea
              className="flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={draft.contraindications}
              onChange={(e) => set({ contraindications: e.target.value })}
              placeholder="e.g. pregnancy"
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
