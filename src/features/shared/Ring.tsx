import { fmt } from "@/lib/format";

/** Circular progress ring (pure SVG). `value`/`target` drive the arc fill. */
export function Ring({
  value,
  target,
  label,
  unit,
  size = 104,
  stroke = 9,
  color = "hsl(var(--primary))",
}: {
  value: number;
  target: number;
  label: string;
  unit: string;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const offset = circumference * (1 - pct);
  const over = target > 0 && value > target * 1.1;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={over ? "hsl(24 90% 52%)" : color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 400ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold leading-none">{fmt(value)}</span>
          <span className="text-[10px] text-muted-foreground">
            / {fmt(target)} {unit}
          </span>
        </div>
      </div>
      <span className="mt-2 text-sm font-medium">{label}</span>
    </div>
  );
}
