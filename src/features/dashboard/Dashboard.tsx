import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { emptyVector, planTotals } from "@/core/totals";
import { Ring } from "@/features/shared/Ring";
import { NutrientCoverage } from "@/features/shared/NutrientCoverage";
import { useTargets } from "@/features/shared/useTargets";
import { fmt } from "@/lib/format";
import { selectFoodsById, useAppStore } from "@/store/useAppStore";

const todayStr = () => new Date().toISOString().slice(0, 10);

export function Dashboard() {
  const profile = useAppStore((s) => s.profile)!;
  const plans = useAppStore((s) => s.plans);
  const foodsById = useAppStore(selectFoodsById);
  const breakdown = useTargets();

  const todayPlan = plans.find((p) => p.id === `plan-${todayStr()}`);
  const totals = useMemo(
    () => (todayPlan ? planTotals(todayPlan, foodsById) : emptyVector()),
    [todayPlan, foodsById],
  );

  if (!breakdown) return null;
  const { targets, bmr, tdee, calories, proteinPerKg } = breakdown;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {profile.name ? `Hi, ${profile.name}` : "Your dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Personalised targets ·{" "}
            <span className="capitalize">{profile.goal} weight</span> ·{" "}
            <span className="capitalize">{profile.dietType}</span>
          </p>
        </div>
        <Link to="/planner">
          <Button>Open planner →</Button>
        </Link>
      </header>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="BMR" value={`${fmt(bmr)}`} unit="kcal" />
        <Stat label="TDEE" value={`${fmt(tdee)}`} unit="kcal" />
        <Stat label="Calorie target" value={`${fmt(calories)}`} unit="kcal" />
        <Stat label="Protein" value={`${proteinPerKg}`} unit="g/kg" />
      </div>

      {/* Macro rings */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Today vs target</CardTitle>
          {!todayPlan && (
            <Badge variant="warning">No plan for today yet</Badge>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Ring
            value={totals.energy_kcal}
            target={targets.energy_kcal}
            label="Energy"
            unit="kcal"
          />
          <Ring
            value={totals.protein_g}
            target={targets.protein_g}
            label="Protein"
            unit="g"
            color="hsl(217 91% 60%)"
          />
          <Ring
            value={totals.carbs_g}
            target={targets.carbs_g}
            label="Carbs"
            unit="g"
            color="hsl(45 93% 47%)"
          />
          <Ring
            value={totals.fat_g}
            target={targets.fat_g}
            label="Fat"
            unit="g"
            color="hsl(280 65% 60%)"
          />
        </CardContent>
      </Card>

      {/* Micronutrient coverage */}
      <Card>
        <CardHeader>
          <CardTitle>Vitamin & mineral coverage</CardTitle>
          <p className="text-sm text-muted-foreground">
            {todayPlan
              ? "Based on today's plan vs your RDA targets."
              : "Build a plan to see how your intake covers your RDA."}
          </p>
        </CardHeader>
        <CardContent>
          <NutrientCoverage totals={totals} targets={targets} />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-2xl font-bold">
          {value}
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            {unit}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
