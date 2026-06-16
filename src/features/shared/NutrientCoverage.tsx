import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  MINERAL_KEYS,
  NUTRIENT_META,
  VITAMIN_KEYS,
  type NutrientVector,
} from "@/core/schema";

/** Horizontal bar chart of micronutrient coverage (% of target met). */
export function NutrientCoverage({
  totals,
  targets,
}: {
  totals: NutrientVector;
  targets: NutrientVector;
}) {
  const data = [...VITAMIN_KEYS, ...MINERAL_KEYS].map((key) => {
    const target = targets[key] ?? 0;
    const pct = target > 0 ? Math.round(((totals[key] ?? 0) / target) * 100) : 0;
    return { name: NUTRIENT_META[key].label, pct };
  });

  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 26, 200)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
      >
        <XAxis
          type="number"
          domain={[0, 150]}
          tickFormatter={(v) => `${v}%`}
          fontSize={11}
          stroke="hsl(var(--muted-foreground))"
        />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          fontSize={11}
          stroke="hsl(var(--muted-foreground))"
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(v: number) => [`${v}%`, "of target"]}
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={
                d.pct < 70
                  ? "hsl(38 92% 50%)"
                  : d.pct <= 120
                    ? "hsl(var(--primary))"
                    : "hsl(24 90% 52%)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
