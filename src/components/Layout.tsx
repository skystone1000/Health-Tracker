import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

const NAV = [
  { to: "/", label: "Dashboard", icon: "◎", end: true },
  { to: "/planner", label: "Planner", icon: "☰" },
  { to: "/foods", label: "Food Database", icon: "🍃" },
  { to: "/recipes", label: "Recipes", icon: "🍲" },
  { to: "/data", label: "Data & Backup", icon: "⤓" },
];

function Logo() {
  return (
    <div className="flex items-center gap-2 px-2">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
        <span className="text-lg">🌱</span>
      </div>
      <div>
        <div className="text-lg font-bold leading-none">Nourish</div>
        <div className="text-[11px] text-muted-foreground">Diet & nutrition</div>
      </div>
    </div>
  );
}

export function Layout() {
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const profile = useAppStore((s) => s.profile);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="border-b border-border bg-card md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <div className="flex h-16 items-center md:h-auto md:py-5">
          <Logo />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:gap-1 md:pb-0">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )
              }
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:block md:px-3 md:pt-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={toggleTheme}
          >
            {theme === "dark" ? "☀ Light mode" : "☾ Dark mode"}
          </Button>
          <button
            onClick={() => navigate("/onboarding")}
            className="mt-3 w-full truncate rounded-lg px-3 py-2 text-left text-xs text-muted-foreground hover:bg-secondary"
          >
            {profile?.name ? `Profile: ${profile.name}` : "Edit profile"} ›
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
        <Outlet />
      </main>
    </div>
  );
}
