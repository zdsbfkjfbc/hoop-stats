import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import Dashboard from "./Dashboard";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-gradient text-2xl font-bold animate-pulse">B-Ball Analytics</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return <Dashboard />;
};

export default Index;
