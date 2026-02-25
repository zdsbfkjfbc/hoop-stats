import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Calendar, Target } from "lucide-react";

interface Treino {
  id: string;
  data: string;
  pontuacao_total: number;
  total_tentativas: number;
  total_acertos: number;
  aproveitamento_geral: number | null;
  efg: number | null;
  consistencia: number | null;
  tendencia: string | null;
}

const Historico = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [treinos, setTreinos] = useState<Treino[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchTreinos();
  }, [user]);

  const fetchTreinos = async () => {
    const { data } = await supabase
      .from("treinos")
      .select("id, data, pontuacao_total, total_tentativas, total_acertos, aproveitamento_geral, efg, consistencia, tendencia")
      .eq("user_id", user!.id)
      .order("data", { ascending: false });

    setTreinos(data ?? []);
    setLoading(false);
  };

  const TendenciaIcon = ({ tendencia }: { tendencia: string | null }) => {
    if (tendencia === "positiva") return <TrendingUp className="h-4 w-4 text-success" />;
    if (tendencia === "negativa") return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center gap-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">
            <span className="text-gradient">Histórico</span>
            <span className="text-foreground"> de Treinos</span>
          </h1>
        </div>
      </header>

      <main className="container max-w-3xl py-8 space-y-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="text-gradient text-lg font-bold animate-pulse">Carregando...</div>
          </div>
        ) : treinos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Calendar className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">Nenhum treino registrado ainda</p>
            <Button className="mt-4" onClick={() => navigate("/treino")}>
              Registrar primeiro treino
            </Button>
          </div>
        ) : (
          treinos.map((treino, i) => (
            <div
              key={treino.id}
              className="glass-card p-5 animate-fade-in"
              style={{ animationDelay: `${Math.min(i * 0.05, 0.5)}s` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">{formatDate(treino.data)}</span>
                </div>
                <TendenciaIcon tendencia={treino.tendencia} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Aproveitamento</p>
                  <p className="text-lg font-bold font-mono text-primary">
                    {treino.aproveitamento_geral != null ? `${Number(treino.aproveitamento_geral).toFixed(1)}%` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pontuação</p>
                  <p className="text-lg font-bold font-mono text-foreground">{treino.pontuacao_total}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">eFG%</p>
                  <p className="text-lg font-bold font-mono text-chart-3pt">
                    {treino.efg != null ? `${(Number(treino.efg) * 100).toFixed(1)}%` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Acertos/Tent.</p>
                  <p className="text-lg font-bold font-mono text-chart-ft">
                    {treino.total_acertos}/{treino.total_tentativas}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default Historico;
