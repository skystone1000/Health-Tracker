import { useEffect, useState } from "react";
import type { Asana } from "@/core/yoga/schema";
import { asanaImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

/**
 * Renders an asana's illustration with a graceful fallback so the UI works
 * before the images are populated. Drop a file at
 * `public/images/asanas/<asana.id>.webp` and it appears automatically. The
 * square artwork is contained, not cropped, so full-body pose form remains
 * visible in cards and detail views.
 */
export function AsanaImage({
  asana,
  className,
}: {
  asana: Asana;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  // Reset when the asana changes (component is reused across poses).
  useEffect(() => setFailed(false), [asana.id]);

  if (failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-secondary/60 text-muted-foreground",
          className,
        )}
        aria-hidden
      >
        <span className="text-3xl">🧘</span>
      </div>
    );
  }

  return (
    <img
      src={asanaImageUrl(asana.id)}
      alt={`${asana.englishName} (${asana.sanskritName})`}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("bg-[#fbf7ef] object-contain", className)}
    />
  );
}
