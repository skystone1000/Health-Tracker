import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { downloadJson, readJsonFile } from "@/lib/download";
import { useAppStore } from "@/store/useAppStore";

export function DataPage() {
  const exportBackup = useAppStore((s) => s.exportBackup);
  const importBackup = useAppStore((s) => s.importBackup);
  const resetUserData = useAppStore((s) => s.resetUserData);
  const customFoods = useAppStore((s) => s.customFoods);
  const overrides = useAppStore((s) => s.foodOverrides);
  const plans = useAppStore((s) => s.plans);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const onExport = () =>
    downloadJson(
      `nourish-backup-${new Date().toISOString().slice(0, 10)}.json`,
      exportBackup(),
    );

  const onImport = async (file: File) => {
    try {
      const data = await readJsonFile(file);
      const result = importBackup(data);
      setMsg(
        result.ok
          ? { ok: true, text: "Backup imported successfully." }
          : { ok: false, text: result.error },
      );
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Data & backup</h1>
        <p className="text-sm text-muted-foreground">
          Everything is stored locally in your browser as JSON. Export a backup
          or move your data to another device.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Custom foods" value={customFoods.length} />
        <Stat label="Edited foods" value={Object.keys(overrides).length} />
        <Stat label="Saved plans" value={plans.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export / import</CardTitle>
          <CardDescription>
            Backups include your profile, custom foods, edits and plans.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={onExport}>⤓ Export JSON backup</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            ⤒ Import backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onImport(file);
              e.target.value = "";
            }}
          />
          {msg && (
            <p
              className={
                "w-full text-sm " +
                (msg.ok ? "text-primary" : "text-destructive")
              }
            >
              {msg.text}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reset</CardTitle>
          <CardDescription>
            Edit your profile, or wipe all local data and start over.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate("/onboarding")}>
            Edit profile
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (
                confirm(
                  "This will delete your profile, custom foods, edits and plans. Continue?",
                )
              ) {
                resetUserData();
                navigate("/onboarding");
              }
            }}
          >
            Reset all data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
