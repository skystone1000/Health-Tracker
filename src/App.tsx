import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAppStore } from "@/store/useAppStore";
import { Dashboard } from "@/features/dashboard/Dashboard";
import { Onboarding } from "@/features/onboarding/Onboarding";
import { FoodDatabase } from "@/features/foods/FoodDatabase";
import { Recipes } from "@/features/recipes/Recipes";
import { Planner } from "@/features/planner/Planner";
import { ExerciseLibrary } from "@/features/exercise/ExerciseLibrary";
import { WorkoutPlan } from "@/features/exercise/WorkoutPlan";
import { AsanaLibrary } from "@/features/yoga/AsanaLibrary";
import { SequenceBuilder } from "@/features/yoga/SequenceBuilder";
import { DataPage } from "@/features/data/DataPage";

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      {message}
    </div>
  );
}

export default function App() {
  const init = useAppStore((s) => s.init);
  const loaded = useAppStore((s) => s.loaded);
  const loadError = useAppStore((s) => s.loadError);
  const profile = useAppStore((s) => s.profile);
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  if (!loaded) return <LoadingScreen message="Loading Nourish…" />;
  if (loadError)
    return <LoadingScreen message={`Failed to load food data: ${loadError}`} />;

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route
        element={profile ? <Layout /> : <Navigate to="/onboarding" replace />}
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/foods" element={<FoodDatabase />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/exercise" element={<ExerciseLibrary />} />
        <Route path="/exercise/plan" element={<WorkoutPlan />} />
        <Route path="/yoga" element={<AsanaLibrary />} />
        <Route path="/yoga/sequence" element={<SequenceBuilder />} />
        <Route path="/data" element={<DataPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
