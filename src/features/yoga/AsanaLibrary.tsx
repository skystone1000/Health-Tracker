import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, CardContent, Input, Select } from "@/components/ui";
import { applyAsanaFilters } from "@/core/yoga/filters";
import {
  ASANA_FAMILIES,
  YOGA_FOCI,
  type Asana,
  type AsanaFamily,
  type YogaFocus,
} from "@/core/yoga/schema";
import { DIFFICULTIES, type Difficulty } from "@/core/activity/schema";
import {
  DIFFICULTY_LABELS,
  FAMILY_LABELS,
  FOCUS_LABELS,
} from "@/lib/activity";
import { selectAllAsanas, useAppStore } from "@/store/useAppStore";
import { AsanaEditor } from "./AsanaEditor";

export function AsanaLibrary() {
  const allAsanas = useAppStore(selectAllAsanas);
  const overrides = useAppStore((s) => s.asanaOverrides);

  const [search, setSearch] = useState("");
  const [family, setFamily] = useState("");
  const [focus, setFocus] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [editing, setEditing] = useState<Asana | null>(null);
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(
    () =>
      applyAsanaFilters(allAsanas, {
        search,
        family: (family || undefined) as AsanaFamily | undefined,
        focus: (focus || undefined) as YogaFocus | undefined,
        difficulty: (difficulty || undefined) as Difficulty | undefined,
      }),
    [allAsanas, search, family, focus, difficulty],
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">🧘 Yoga</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} asanas across every family · breathe, stretch and
            find balance
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/yoga/sequence">
            <Button variant="secondary">My sequence →</Button>
          </Link>
          <Button onClick={() => setAdding(true)}>+ Add</Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-xs"
          placeholder="Search asanas…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          className="max-w-[170px]"
          value={family}
          onChange={(e) => setFamily(e.target.value)}
        >
          <option value="">All families</option>
          {ASANA_FAMILIES.map((f) => (
            <option key={f} value={f}>
              {FAMILY_LABELS[f]}
            </option>
          ))}
        </Select>
        <Select
          className="max-w-[150px]"
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
        >
          <option value="">All focus</option>
          {YOGA_FOCI.map((f) => (
            <option key={f} value={f}>
              {FOCUS_LABELS[f]}
            </option>
          ))}
        </Select>
        <Select
          className="max-w-[150px]"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="">All levels</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABELS[d]}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((a) => (
          <Card
            key={a.id}
            className="cursor-pointer transition-colors hover:border-primary/40"
            onClick={() => setEditing(a)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold leading-tight">
                    {a.englishName}
                  </div>
                  <div className="text-xs italic text-muted-foreground">
                    {a.sanskritName}
                  </div>
                </div>
                {a.verification.status === "verified" ? (
                  <Badge variant="success">✓</Badge>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1">
                <Badge variant="outline">{FAMILY_LABELS[a.family]}</Badge>
                <Badge variant="secondary">
                  {DIFFICULTY_LABELS[a.difficulty]}
                </Badge>
                {a.source === "user" && <Badge variant="default">custom</Badge>}
                {overrides[a.id] && <Badge variant="default">edited</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-muted-foreground">
            No asanas match your filters.
          </p>
        )}
      </div>

      <AsanaEditor
        asana={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
      />
      <AsanaEditor asana={null} open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
