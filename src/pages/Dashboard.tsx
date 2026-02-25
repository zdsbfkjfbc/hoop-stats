import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Target, TrendingUp, Activity, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ShotStats {
  tipo: string;
  totalTentativas: number;
  totalAcertos: number;
  percentual: number;
}

interface EvolutionPoint {
  data: string;
  "2PT": number | null;
  "3PT": number | null;
  FT: number | null;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ShotStats[]>([]);
  const [evolution, setEvolution] = useState<EvolutionPoint[]>([]);
  const [nome, setNome] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome")
      .eq("user_id", user!.id)
      .single();
    if (profile) setNome(profile.nome);

    // Fetch all treinos with series
    const { data: treinos } = await supabase
      .from("treinos")
      .select("id, data")
      .eq("user_id", user!.id)
      .order("data", { ascending: true });

    if (!treinos || treinos.length === 0) {
      setStats([]);
      setEvolution([]);
      return;
    }

    const treinoIds = treinos.map((t) => t.id);
    const { data: allSeries } = await supabase
      .from("series")
      .select("*")
      .in("treino_id", treinoIds);

    if (!allSeries) return;

    // Stats by type
    const grouped: Record<string, { tentativas: number; acertos: number }> = {};
    for (const s of allSeries) {
      if (!grouped[s.tipo_arremesso]) grouped[s.tipo_arremesso] = { tentativas: 0, acertos: 0 };
      grouped[s.tipo_arremesso].tentativas += s.tentativas;
      grouped[s.tipo_arremesso].acertos += s.acertos;
    }
    const shotStats: ShotStats[] = Object.entries(grouped).map(([tipo, v]) => ({
      tipo,
      totalTentativas: v.tentativas,
      totalAcertos: v.acertos,
      percentual: v.tentativas > 0 ? Math.round((v.acertos / v.tentativas) * 10000) / 100 : 0,
    }));
    setStats(shotStats);

    // Evolution by date
    const byDate: Record<string, Record<string, { t: number; a: number }>> = {};
    for (const s of allSeries) {
      const treino = treinos.find((t) => t.id === s.treino_id);
      if (!treino) continue;
      const d = treino.data;
      if (!byDate[d]) byDate[d] = {};
      if (!byDate[d][s.tipo_arremesso]) byDate[d][s.tipo_arremesso] = { t: 0, a: 0 };
      byDate[d][s.tipo_arremesso].t += s.tentativas;
      byDate[d][s.tipo_arremesso].a += s.acertos;
    }
    const evoData: EvolutionPoint[] = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, tipos]) => ({
        data: new Date(data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        "2PT": tipos["2PT"] ? Math.round((tipos["2PT"].a / tipos["2PT"].t) * 10000) / 100 : null,
        "3PT": tipos["3PT"] ? Math.round((tipos["3PT"].a / tipos["3PT"].t) * 10000) / 100 : null,
        FT: tipos["FT"] ? Math.round((tipos["FT"].a / tipos["FT"].t) * 10000) / 100 : null,
      }));
    setEvolution(evoData);
  };

  const statConfig: Record<string, { label: string; colorVar: string; icon: typeof Target }> = {
    "2PT": { label: "2 Pontos", colorVar: "hsl(var(--chart-2pt))", icon: Target },
    "3PT": { label: "3 Pontos", colorVar: "hsl(var(--chart-3pt))", icon: TrendingUp },
    FT: { label: "Lance Livre", colorVar: "hsl(var(--chart-ft))", icon: Activity },
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-xl font-bold">
            <span className="text-gradient">B-Ball</span>
            <span className="text-foreground"> Analytics</span>
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Olá, {nome || "Jogador"}
            </span>
            <Button size="sm" onClick={() => navigate("/treino")} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Treino
            </Button>
            <Button size="sm" variant="ghost" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Stats Cards */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-foreground">Aproveitamento por Tipo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(["2PT", "3PT", "FT"] as const).map((tipo) => {
              const s = stats.find((x) => x.tipo === tipo);
              const cfg = statConfig[tipo];
              const Icon = cfg.icon;
              return (
                <div key={tipo} className="glass-card p-6 animate-fade-in">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: cfg.colorVar + "20" }}
                    >
                      <Icon className="h-5 w-5" style={{ color: cfg.colorVar }} />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">{cfg.label}</span>
                  </div>
                  <p className="text-3xl font-bold font-mono" style={{ color: cfg.colorVar }}>
                    {s ? `${s.percentual}%` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {s ? `${s.totalAcertos}/${s.totalTentativas} arremessos` : "Sem dados"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Evolution Chart */}
        <section className="glass-card p-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-lg font-semibold mb-6 text-foreground">Evolução do Aproveitamento</h2>
          {evolution.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={evolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="data" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="2PT" stroke="hsl(var(--chart-2pt))" strokeWidth={2} dot={{ r: 4 }} connectNulls name="2 Pontos" />
                <Line type="monotone" dataKey="3PT" stroke="hsl(var(--chart-3pt))" strokeWidth={2} dot={{ r: 4 }} connectNulls name="3 Pontos" />
                <Line type="monotone" dataKey="FT" stroke="hsl(var(--chart-ft))" strokeWidth={2} dot={{ r: 4 }} connectNulls name="Lance Livre" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Activity className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">Registre treinos para ver sua evolução</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
