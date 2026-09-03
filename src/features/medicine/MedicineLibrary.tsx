import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, CardContent, Input, Select } from "@/components/ui";
import { applyMedicineFilters } from "@/core/medicine/filters";
import {
  MEDICINE_SYSTEMS,
  categoriesForSystem,
  type Medicine,
  type MedicineCategory,
  type MedicineSystem,
} from "@/core/medicine/schema";
import { CATEGORY_LABELS, FORM_LABELS, SYSTEM_LABELS } from "@/lib/medicine";
import {
  selectAllMedicines,
  selectOwnedMedicineIds,
  useAppStore,
} from "@/store/useAppStore";
import { MedicineDetail } from "./MedicineDetail";
import { MedicineEditor } from "./MedicineEditor";

export function MedicineLibrary() {
  const all = useAppStore(selectAllMedicines);
  const ownedIds = useAppStore(selectOwnedMedicineIds);
  const overrides = useAppStore((s) => s.medicineOverrides);

  const [search, setSearch] = useState("");
  const [system, setSystem] = useState<MedicineSystem | "">("");
  const [category, setCategory] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [viewing, setViewing] = useState<Medicine | null>(null);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(
    () =>
      applyMedicineFilters(
        all,
        {
          search,
          system: (system || undefined) as MedicineSystem | undefined,
          category: (category || undefined) as MedicineCategory | undefined,
          ownedOnly,
        },
        ownedIds,
      ),
    [all, search, system, category, ownedOnly, ownedIds],
  );

  const categoryOptions = system ? categoriesForSystem(system) : [];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">💊 Medicine</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} medicines · allopathy, homeopathy & biochemic · tap
            any to view details
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/medicine/cabinet">
            <Button variant="secondary">My cabinet →</Button>
          </Link>
          <Button onClick={() => setAdding(true)}>+ Add</Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-xs"
          placeholder="Search medicines…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          className="max-w-[160px]"
          value={system}
          onChange={(e) => {
            setSystem(e.target.value as MedicineSystem | "");
            setCategory("");
          }}
        >
          <option value="">All systems</option>
          {MEDICINE_SYSTEMS.map((s) => (
            <option key={s} value={s}>
              {SYSTEM_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select
          className="max-w-[170px]"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={!system}
        >
          <option value="">All categories</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 rounded-lg border border-border px-3 text-sm">
          <input
            type="checkbox"
            checked={ownedOnly}
            onChange={(e) => setOwnedOnly(e.target.checked)}
          />
          In my cabinet
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => (
          <Card
            key={m.id}
            className="cursor-pointer transition-colors hover:border-primary/40"
            onClick={() => setViewing(m)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold leading-tight">{m.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {SYSTEM_LABELS[m.system]} · {CATEGORY_LABELS[m.category]}
                  </div>
                </div>
                {ownedIds.has(m.id) && <Badge variant="success">✓ owned</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1">
                <Badge variant="secondary">{FORM_LABELS[m.form]}</Badge>
                {m.potency && <Badge variant="outline">{m.potency}</Badge>}
                {m.source === "user" && <Badge variant="default">custom</Badge>}
                {overrides[m.id] && <Badge variant="default">edited</Badge>}
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(m);
                  }}
                >
                  Edit / stock
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-muted-foreground">
            No medicines match your filters.
          </p>
        )}
      </div>

      <MedicineDetail
        medicine={viewing}
        open={!!viewing}
        onClose={() => setViewing(null)}
      />
      <MedicineEditor
        medicine={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
      />
      <MedicineEditor
        medicine={null}
        open={adding}
        onClose={() => setAdding(false)}
      />
    </div>
  );
}
