import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import { cabinetSummary } from "@/core/medicine/stock";
import type { Medicine, MedicineStockEntry } from "@/core/medicine/schema";
import { UNIT_LABELS } from "@/lib/medicine";
import {
  selectMedicinesById,
  useAppStore,
} from "@/store/useAppStore";
import { MedicineEditor } from "./MedicineEditor";

const today = () => new Date().toISOString().slice(0, 10);

function Group({
  title,
  tone,
  entries,
  byId,
  onEdit,
}: {
  title: string;
  tone: "warning" | "success" | "secondary";
  entries: MedicineStockEntry[];
  byId: Map<string, Medicine>;
  onEdit: (m: Medicine) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {title}
        <Badge variant={tone}>{entries.length}</Badge>
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {entries.map((e) => {
          const m = byId.get(e.medicineId);
          return (
            <Card key={e.medicineId}>
              <CardContent className="flex items-center justify-between gap-2 p-3">
                <div>
                  <div className="font-medium">{m?.name ?? e.medicineId}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.quantity} {UNIT_LABELS[e.unit]}
                    {e.expiryDate ? ` · exp ${e.expiryDate}` : ""}
                  </div>
                </div>
                {m && (
                  <Button size="sm" variant="ghost" onClick={() => onEdit(m)}>
                    Edit
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export function MyCabinet() {
  const stock = useAppStore((s) => s.medicineStock);
  const byId = useAppStore(selectMedicinesById);
  const [editing, setEditing] = useState<Medicine | null>(null);

  const summary = useMemo(() => cabinetSummary(stock, today()), [stock]);
  const ownedCount =
    summary.expired.length +
    summary.expiringSoon.length +
    summary.lowStock.length +
    summary.ok.length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">💊 My cabinet</h1>
          <p className="text-sm text-muted-foreground">
            {ownedCount} medicine{ownedCount === 1 ? "" : "s"} in your cabinet
          </p>
        </div>
        <Link to="/medicine">
          <Button variant="secondary">← Medicine library</Button>
        </Link>
      </header>

      {ownedCount === 0 ? (
        <p className="py-10 text-center text-muted-foreground">
          Nothing here yet. Open a medicine in the{" "}
          <Link to="/medicine" className="underline">
            library
          </Link>{" "}
          and tick “I have this in my cabinet”.
        </p>
      ) : (
        <>
          <Group
            title="Expired"
            tone="warning"
            entries={summary.expired}
            byId={byId}
            onEdit={setEditing}
          />
          <Group
            title="Expiring soon"
            tone="warning"
            entries={summary.expiringSoon}
            byId={byId}
            onEdit={setEditing}
          />
          <Group
            title="Low stock"
            tone="secondary"
            entries={summary.lowStock}
            byId={byId}
            onEdit={setEditing}
          />
          <Group
            title="OK"
            tone="success"
            entries={summary.ok}
            byId={byId}
            onEdit={setEditing}
          />
        </>
      )}

      <MedicineEditor
        medicine={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
