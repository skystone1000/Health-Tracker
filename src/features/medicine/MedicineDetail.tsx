import { Badge, Modal } from "@/components/ui";
import type { Medicine } from "@/core/medicine/schema";
import { CATEGORY_LABELS, FORM_LABELS, SYSTEM_LABELS } from "@/lib/medicine";

export function MedicineDetail({
  medicine,
  open,
  onClose,
}: {
  medicine: Medicine | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!medicine) return null;
  const m = medicine;
  return (
    <Modal open={open} onClose={onClose} title={m.name}>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-1">
          <Badge>{SYSTEM_LABELS[m.system]}</Badge>
          <Badge variant="outline">{CATEGORY_LABELS[m.category]}</Badge>
          <Badge variant="secondary">{FORM_LABELS[m.form]}</Badge>
          {m.potency && <Badge variant="outline">{m.potency}</Badge>}
        </div>

        {m.brandNames.length > 0 && (
          <p className="text-muted-foreground">
            Also sold as: {m.brandNames.join(", ")}
          </p>
        )}

        {m.commonUses.length > 0 && (
          <section>
            <h3 className="font-semibold">Common uses</h3>
            <ul className="mt-1 list-disc pl-5">
              {m.commonUses.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
          </section>
        )}

        {m.dosageNote && (
          <section>
            <h3 className="font-semibold">Notes</h3>
            <p className="mt-1 text-muted-foreground">{m.dosageNote}</p>
          </section>
        )}

        {m.cautions.length > 0 && (
          <section>
            <h3 className="font-semibold">Cautions</h3>
            <ul className="mt-1 list-disc pl-5">
              {m.cautions.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </section>
        )}

        {m.contraindications.length > 0 && (
          <section>
            <h3 className="font-semibold">Who should avoid</h3>
            <ul className="mt-1 list-disc pl-5">
              {m.contraindications.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </section>
        )}

        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          ⚠ This information is for reference only and is not medical advice.
          Always read the package leaflet and consult a qualified doctor or
          pharmacist before taking any medicine.
        </p>

        {m.evidences.length > 0 && (
          <section>
            <h3 className="font-semibold">Sources</h3>
            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
              {m.evidences.map((e, i) => (
                <li key={i}>
                  {e.url ? (
                    <a
                      href={e.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      {e.source}
                    </a>
                  ) : (
                    e.source
                  )}
                  {e.ref ? ` — ${e.ref}` : ""}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  );
}
