import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Input, Label, Modal, Select } from "@/components/ui";
import { DIFFICULTIES } from "@/core/activity/schema";
import {
  ASANA_FAMILIES,
  AsanaSchema,
  YOGA_FOCI,
  YOGA_STYLES,
  type Asana,
} from "@/core/yoga/schema";
import { suggestCounters } from "@/core/yoga/counterpose";
import {
  DIFFICULTY_LABELS,
  FAMILY_LABELS,
  FOCUS_LABELS,
  KNOWN_TAGS,
  STYLE_LABELS,
} from "@/lib/activity";
import { useAppStore } from "@/store/useAppStore";
import { AsanaImage } from "./AsanaImage";

interface Draft {
  id: string;
  sanskritName: string;
  englishName: string;
  family: Asana["family"];
  difficulty: Asana["difficulty"];
  metValue: number;
  focus: Asana["focus"];
  styles: Asana["styles"];
  tags: string[];
  defaultHoldSec: number;
  steps: string;
  benefits: string;
  cons: string;
  contraindications: string;
  counterAsanaIds: string[];
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
    styles: a?.styles ?? ["hatha"],
    tags: a?.tags ?? [],
    defaultHoldSec: a?.defaultHoldSec ?? 30,
    steps: a?.steps.join("\n") ?? "",
    benefits: a?.benefits.join("\n") ?? "",
    cons: a?.cons.join("\n") ?? "",
    contraindications: a?.contraindications.join("\n") ?? "",
    counterAsanaIds: a?.counterAsanaIds ?? [],
  };
}

export function AsanaEditor({
  asana,
  all,
  open,
  onClose,
  onOpenAsana,
}: {
  asana: Asana | null;
  all: Asana[];
  open: boolean;
  onClose: () => void;
  onOpenAsana?: (a: Asana) => void;
}) {
  const upsertAsana = useAppStore((s) => s.upsertAsana);
  const deleteAsana = useAppStore((s) => s.deleteAsana);
  const resetAsana = useAppStore((s) => s.resetAsana);
  const overrides = useAppStore((s) => s.asanaOverrides);

  const isNew = !asana;
  const [editing, setEditing] = useState(isNew);
  const [draft, setDraft] = useState<Draft>(toDraft(asana));
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(() => new Map(all.map((a) => [a.id, a])), [all]);

  useEffect(() => {
    setDraft(toDraft(asana));
    setEditing(!asana);
    setError(null);
  }, [asana, open]);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const toggleArr = <K extends "focus" | "styles" | "tags" | "counterAsanaIds">(
    key: K,
    val: string,
    allowEmpty = true,
  ) => {
    const list = draft[key] as string[];
    const has = list.includes(val);
    const next = has ? list.filter((x) => x !== val) : [...list, val];
    set({ [key]: next.length || allowEmpty ? next : list } as unknown as Partial<Draft>);
  };

  const suggest = () => {
    const pseudo = { ...(asana ?? {}), id: draft.id || "new", family: draft.family } as Asana;
    set({ counterAsanaIds: suggestCounters(pseudo, all).map((a) => a.id) });
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
      styles: draft.styles,
      tags: draft.tags,
      steps: lines(draft.steps),
      benefits: lines(draft.benefits),
      cons: lines(draft.cons),
      contraindications: lines(draft.contraindications),
      counterAsanaIds: draft.counterAsanaIds.filter((cid) => cid !== id),
      defaultHoldSec: Number(draft.defaultHoldSec) || 30,
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
          <AsanaImage
            asana={asana}
            className="h-80 w-full rounded-lg border border-border"
          />
          <div className="flex flex-wrap gap-1">
            <Badge variant="default">{FAMILY_LABELS[asana.family]}</Badge>
            <Badge variant="outline">
              {DIFFICULTY_LABELS[asana.difficulty]}
            </Badge>
            {asana.styles.map((s) => (
              <Badge key={s} variant="secondary">
                {STYLE_LABELS[s]}
              </Badge>
            ))}
          </div>

          {asana.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {asana.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {asana.steps.length > 0 && (
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {asana.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}

          {asana.benefits.length > 0 && (
            <div className="text-sm">
              <Label>Benefits (pros)</Label>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {asana.benefits.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          {asana.cons.length > 0 && (
            <div className="text-sm">
              <Label>Cautions (cons)</Label>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {asana.cons.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {asana.contraindications.length > 0 && (
            <div>
              <Label>Who should avoid it</Label>
              <p className="mt-1 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                ⚠ {asana.contraindications.join(", ")}.
                <br />
                Not medical advice — consult a professional if unsure.
              </p>
            </div>
          )}

          {asana.counterAsanaIds.length > 0 && (
            <div>
              <Label>Counter pose (viparit)</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {asana.counterAsanaIds.map((cid) => {
                  const c = byId.get(cid);
                  if (!c) return null;
                  return (
                    <button
                      key={cid}
                      onClick={() => onOpenAsana?.(c)}
                      className="rounded-full border border-border px-3 py-1 text-xs transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      {c.englishName} →
                    </button>
                  );
                })}
              </div>
            </div>
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

          <Chips
            label="Focus"
            options={[...YOGA_FOCI]}
            selected={draft.focus}
            labelFor={(f) => FOCUS_LABELS[f as Asana["focus"][number]]}
            onToggle={(f) => toggleArr("focus", f, false)}
          />
          <Chips
            label="Styles / traditions"
            options={[...YOGA_STYLES]}
            selected={draft.styles}
            labelFor={(s) => STYLE_LABELS[s as Asana["styles"][number]]}
            onToggle={(s) => toggleArr("styles", s)}
          />
          <Chips
            label="Tags"
            options={[...KNOWN_TAGS]}
            selected={draft.tags}
            labelFor={(t) => t}
            onToggle={(t) => toggleArr("tags", t)}
          />

          <div className="space-y-1.5">
            <Label>Steps (one per line)</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={draft.steps}
              onChange={(e) => set({ steps: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Benefits / pros (one per line)</Label>
            <textarea
              className="flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={draft.benefits}
              onChange={(e) => set({ benefits: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cautions / cons (one per line)</Label>
            <textarea
              className="flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={draft.cons}
              onChange={(e) => set({ cons: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Who should avoid (one per line)</Label>
            <textarea
              className="flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={draft.contraindications}
              onChange={(e) => set({ contraindications: e.target.value })}
              placeholder="e.g. pregnancy"
            />
          </div>

          {/* Counter poses (viparit) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Counter poses (viparit)</Label>
              <Button type="button" variant="ghost" size="sm" onClick={suggest}>
                Suggest
              </Button>
            </div>
            {draft.counterAsanaIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {draft.counterAsanaIds.map((cid) => (
                  <Badge
                    key={cid}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => toggleArr("counterAsanaIds", cid)}
                  >
                    {byId.get(cid)?.englishName ?? cid} ✕
                  </Badge>
                ))}
              </div>
            )}
            <Select
              value=""
              onChange={(e) => {
                if (e.target.value) toggleArr("counterAsanaIds", e.target.value);
              }}
            >
              <option value="">+ Add a counter pose…</option>
              {all
                .filter(
                  (a) =>
                    a.id !== (draft.id || "new") &&
                    !draft.counterAsanaIds.includes(a.id),
                )
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.englishName}
                  </option>
                ))}
            </Select>
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

function Chips({
  label,
  options,
  selected,
  labelFor,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  labelFor: (v: string) => string;
  onToggle: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={
              "rounded-lg border px-2.5 py-1 text-xs transition-colors " +
              (selected.includes(o)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-secondary")
            }
          >
            {labelFor(o)}
          </button>
        ))}
      </div>
    </div>
  );
}
