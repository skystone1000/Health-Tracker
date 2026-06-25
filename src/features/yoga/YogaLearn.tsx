import { Link } from "react-router-dom";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { YOGA_THEORY, type TheorySection } from "@/core/yoga/theory";
import { EIGHT_LIMBS, YOGA_STYLE_INFO } from "@/core/yoga/styles";

export function YogaLearn() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">📖 Learn yoga</h1>
        <p className="text-sm text-muted-foreground">
          What yoga is, where it comes from, its paths and styles — a plain-language
          overview.
        </p>
      </header>

      <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
        ⚠ Educational overview only. Traditional concepts (e.g. chakras, gunas) are
        presented as part of yoga philosophy, not medical or religious advice.
      </p>

      {/* In-page contents */}
      <Card>
        <CardContent className="flex flex-wrap gap-2 p-4">
          {YOGA_THEORY.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {s.title}
            </a>
          ))}
        </CardContent>
      </Card>

      {YOGA_THEORY.map((section) => (
        <Section key={section.id} section={section} />
      ))}
    </div>
  );
}

function Section({ section }: { section: TheorySection }) {
  return (
    <Card id={section.id} className="scroll-mt-6">
      <CardHeader>
        <CardTitle>{section.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{section.summary}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {section.body.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed">
            {p}
          </p>
        ))}

        {section.bullets && (
          <ul className="space-y-2">
            {section.bullets.map((b, i) => (
              <li key={i} className="text-sm">
                <b>{b.term}</b> — {b.text}
              </li>
            ))}
          </ul>
        )}

        {section.render === "eightLimbs" && (
          <ol className="space-y-2">
            {EIGHT_LIMBS.map((limb, i) => (
              <li key={limb.sanskrit} className="text-sm">
                <b>
                  {i + 1}. {limb.sanskrit}
                </b>{" "}
                <span className="text-muted-foreground">({limb.english})</span> —{" "}
                {limb.description}
              </li>
            ))}
          </ol>
        )}

        {section.render === "styles" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {YOGA_STYLE_INFO.map((style) => (
              <Link
                key={style.id}
                to={`/yoga?style=${style.id}`}
                className="rounded-lg border border-border p-3 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{style.name}</span>
                  <Badge variant="outline">{style.pace}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {style.summary}
                </p>
                <p className="mt-2 text-xs">
                  <span className="text-muted-foreground">Best for: </span>
                  {style.bestFor.join(" · ")}
                  {style.usesProps && " · uses props"}
                </p>
              </Link>
            ))}
          </div>
        )}

        <div className="pt-1 text-xs text-muted-foreground">
          Sources:{" "}
          {section.sources.map((src, i) => (
            <span key={i}>
              {i > 0 && " · "}
              {src.url ? (
                <a
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {src.title}
                </a>
              ) : (
                src.title
              )}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
