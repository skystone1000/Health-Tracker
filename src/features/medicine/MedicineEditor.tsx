import { useEffect, useState } from "react";
import { Button, Input, Label, Modal, Select } from "@/components/ui";
import {
  MEDICINE_FORMS,
  MEDICINE_SYSTEMS,
  STOCK_UNITS,
  categoriesForSystem,
  type Medicine,
  type MedicineForm,
  type MedicineStockEntry,
  type MedicineSystem,
  type StockUnit,
} from "@/core/medicine/schema";
import {
  CATEGORY_LABELS,
  FORM_LABELS,
  SYSTEM_LABELS,
  UNIT_LABELS,
} from "@/lib/medicine";
import { useAppStore } from "@/store/useAppStore";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const lines = (s: string): string[] =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export function MedicineEditor({
  medicine,
  open,
  onClose,
}: {
  medicine: Medicine | null; // null => add new
  open: boolean;
  onClose: () => void;
}) {
  const upsertMedicine = useAppStore((s) => s.upsertMedicine);
  const deleteMedicine = useAppStore((s) => s.deleteMedicine);
  const resetMedicine = useAppStore((s) => s.resetMedicine);
  const setStock = useAppStore((s) => s.setStock);
  const stockList = useAppStore((s) => s.medicineStock);
  const overrides = useAppStore((s) => s.medicineOverrides);

  const isEdit = !!medicine;
  const isDefault = medicine?.source === "default";

  const [name, setName] = useState("");
  const [system, setSystem] = useState<MedicineSystem>("allopathy");
  const [category, setCategory] = useState<string>("analgesic");
  const [form, setForm] = useState<MedicineForm>("tablet");
  const [potency, setPotency] = useState("");
  const [brandNames, setBrandNames] = useState("");
  const [commonUses, setCommonUses] = useState("");
  const [cautions, setCautions] = useState("");
  const [contraindications, setContraindications] = useState("");

  // stock fields
  const [owned, setOwned] = useState(false);
  const [quantity, setQuantity] = useState("0");
  const [unit, setUnit] = useState<StockUnit>("strips");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    const m = medicine;
    setName(m?.name ?? "");
    setSystem(m?.system ?? "allopathy");
    setCategory(m?.category ?? "analgesic");
    setForm(m?.form ?? "tablet");
    setPotency(m?.potency ?? "");
    setBrandNames((m?.brandNames ?? []).join(", "));
    setCommonUses((m?.commonUses ?? []).join("\n"));
    setCautions((m?.cautions ?? []).join("\n"));
    setContraindications((m?.contraindications ?? []).join("\n"));

    const existing = m
      ? stockList.find((e) => e.medicineId === m.id)
      : undefined;
    setOwned(existing?.owned ?? false);
    setQuantity(String(existing?.quantity ?? 0));
    setUnit(existing?.unit ?? "strips");
    setExpiryDate(existing?.expiryDate ?? "");
    setNotes(existing?.notes ?? "");
  }, [open, medicine, stockList]);

  // Keep category valid when the system changes.
  useEffect(() => {
    const valid = categoriesForSystem(system) as readonly string[];
    if (!valid.includes(category)) setCategory(valid[0]);
  }, [system, category]);

  const save = () => {
    const id = medicine?.id ?? (slugify(name) || `medicine-${Date.now()}`);
    const next: Medicine = {
      id,
      name: name.trim() || id,
      brandNames: brandNames
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean),
      system,
      category: category as Medicine["category"],
      form,
      potency: potency.trim() || undefined,
      commonUses: lines(commonUses),
      dosageNote: medicine?.dosageNote,
      cautions: lines(cautions),
      contraindications: lines(contraindications),
      tags: medicine?.tags ?? [],
      evidences: medicine?.evidences ?? [],
      verification: medicine?.verification ?? {
        status: "unverified",
        confidence: "low",
      },
      source: isDefault ? "default" : "user",
    };

    // Only persist the medicine when its content actually changed. For a default
    // this avoids writing a spurious override (and an "edited" badge) when the
    // user merely toggled cabinet stock — stock is saved separately below.
    const contentChanged =
      !medicine ||
      next.name !== medicine.name ||
      next.system !== medicine.system ||
      next.category !== medicine.category ||
      next.form !== medicine.form ||
      (next.potency ?? "") !== (medicine.potency ?? "") ||
      next.brandNames.join("|") !== medicine.brandNames.join("|") ||
      next.commonUses.join("|") !== medicine.commonUses.join("|") ||
      next.cautions.join("|") !== medicine.cautions.join("|") ||
      next.contraindications.join("|") !== medicine.contraindications.join("|");
    if (contentChanged) upsertMedicine(next);

    const stock: MedicineStockEntry = {
      medicineId: id,
      owned,
      quantity: Number(quantity) || 0,
      unit,
      expiryDate: expiryDate || undefined,
      notes: notes.trim() || undefined,
    };
    setStock(stock);
    onClose();
  };

  const scopedCategories = categoriesForSystem(system);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? medicine!.name : "Add medicine"}
      description={
        isDefault
          ? "Editing a default medicine saves a personal override; the default stays intact."
          : undefined
      }
    >
      <div className="space-y-3">
        <div>
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Paracetamol"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>System</Label>
            <Select
              value={system}
              onChange={(e) => setSystem(e.target.value as MedicineSystem)}
            >
              {MEDICINE_SYSTEMS.map((s) => (
                <option key={s} value={s}>
                  {SYSTEM_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {scopedCategories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Form</Label>
            <Select
              value={form}
              onChange={(e) => setForm(e.target.value as MedicineForm)}
            >
              {MEDICINE_FORMS.map((f) => (
                <option key={f} value={f}>
                  {FORM_LABELS[f]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Potency (optional)</Label>
            <Input
              value={potency}
              onChange={(e) => setPotency(e.target.value)}
              placeholder="e.g. 30C, 6X, Q"
            />
          </div>
        </div>

        <div>
          <Label>Brand names (comma-separated)</Label>
          <Input
            value={brandNames}
            onChange={(e) => setBrandNames(e.target.value)}
            placeholder="Crocin, Dolo 650"
          />
        </div>
        <div>
          <Label>Common uses (one per line)</Label>
          <textarea
            className="flex min-h-[70px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            value={commonUses}
            onChange={(e) => setCommonUses(e.target.value)}
          />
        </div>
        <div>
          <Label>Cautions (one per line)</Label>
          <textarea
            className="flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            value={cautions}
            onChange={(e) => setCautions(e.target.value)}
          />
        </div>
        <div>
          <Label>Who should avoid (one per line)</Label>
          <textarea
            className="flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            value={contraindications}
            onChange={(e) => setContraindications(e.target.value)}
          />
        </div>

        <div className="rounded-lg border border-border p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={owned}
              onChange={(e) => setOwned(e.target.checked)}
            />
            I have this in my cabinet
          </label>
          {owned && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as StockUnit)}
                >
                  {STOCK_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {UNIT_LABELS[u]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Expiry date</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="optional"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-between gap-2 pt-1">
          <div className="flex gap-2">
            {medicine?.source === "user" && (
              <Button
                variant="destructive"
                onClick={() => {
                  deleteMedicine(medicine.id);
                  onClose();
                }}
              >
                Delete
              </Button>
            )}
            {isDefault && overrides[medicine!.id] && (
              <Button
                variant="outline"
                onClick={() => {
                  resetMedicine(medicine!.id);
                  onClose();
                }}
              >
                Reset to default
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
