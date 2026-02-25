import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, Save } from "lucide-react";

interface Serie {
  tipo_arremesso: "2PT" | "3PT" | "FT";
  tentativas: number;
  acertos: number;
}

const RegistroTreino = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [series, setSeries] = useState<Serie[]>([{ tipo_arremesso: "2PT", tentativas: 10, acertos: 0 }]);
  const [saving, setSaving] = useState(false);

  const addSerie = () => {
    setSeries([...series, { tipo_arremesso: "2PT", tentativas: 10, acertos: 0 }]);
  };

  const removeSerie = (index: number) => {
    if (series.length === 1) return;
    setSeries(series.filter((_, i) => i !== index));
  };

  const updateSerie = (index: number, field: keyof Serie, value: string | number) => {
    const updated = [...series];
    (updated[index] as any)[field] = value;
    setSeries(updated);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate
    for (let i = 0; i < series.length; i++) {
      const s = series[i];
      if (s.tentativas <= 0) {
        toast.error(`Série ${i + 1}: tentativas deve ser maior que 0`);
        return;
      }
      if (s.acertos > s.tentativas) {
        toast.error(`Série ${i + 1}: acertos não podem ser maiores que tentativas`);
        return;
      }
      if (s.acertos < 0) {
        toast.error(`Série ${i + 1}: acertos não pode ser negativo`);
        return;
      }
    }

    setSaving(true);

    const { data: treino, error: treinoError } = await supabase
      .from("treinos")
      .insert({ user_id: user.id, data })
      .select("id")
      .single();

    if (treinoError || !treino) {
      toast.error("Erro ao salvar treino");
      setSaving(false);
      return;
    }

    const seriesData = series.map((s, i) => ({
      treino_id: treino.id,
      tipo_arremesso: s.tipo_arremesso,
      numero_serie: i + 1,
      tentativas: s.tentativas,
      acertos: s.acertos,
      percentual: Math.round((s.acertos / s.tentativas) * 10000) / 100,
    }));

    const { error: seriesError } = await supabase.from("series").insert(seriesData);

    if (seriesError) {
      toast.error("Erro ao salvar séries");
    } else {
      toast.success("Treino registrado com sucesso!");
      navigate("/");
    }
    setSaving(false);
  };

  const tipoColors: Record<string, string> = {
    "2PT": "hsl(var(--chart-2pt))",
    "3PT": "hsl(var(--chart-3pt))",
    FT: "hsl(var(--chart-ft))",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center gap-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">
            <span className="text-gradient">Registro</span>
            <span className="text-foreground"> de Treino</span>
          </h1>
        </div>
      </header>

      <main className="container max-w-2xl py-8 space-y-6 animate-fade-in">
        <div className="glass-card p-6">
          <Label htmlFor="data">Data do Treino</Label>
          <Input
            id="data"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="mt-2 max-w-xs"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Séries</h2>
            <Button size="sm" variant="outline" onClick={addSerie} className="gap-2">
              <Plus className="h-4 w-4" /> Adicionar Série
            </Button>
          </div>

          {series.map((serie, index) => (
            <div key={index} className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span
                  className="text-sm font-bold px-3 py-1 rounded-md"
                  style={{
                    backgroundColor: tipoColors[serie.tipo_arremesso] + "20",
                    color: tipoColors[serie.tipo_arremesso],
                  }}
                >
                  Série {index + 1}
                </span>
                {series.length > 1 && (
                  <Button size="sm" variant="ghost" onClick={() => removeSerie(index)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Arremesso</Label>
                  <Select
                    value={serie.tipo_arremesso}
                    onValueChange={(v) => updateSerie(index, "tipo_arremesso", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2PT">2 Pontos</SelectItem>
                      <SelectItem value="3PT">3 Pontos</SelectItem>
                      <SelectItem value="FT">Lance Livre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tentativas</Label>
                  <Input
                    type="number"
                    min={1}
                    value={serie.tentativas}
                    onChange={(e) => updateSerie(index, "tentativas", parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Acertos</Label>
                  <Input
                    type="number"
                    min={0}
                    max={serie.tentativas}
                    value={serie.acertos}
                    onChange={(e) => updateSerie(index, "acertos", parseInt(e.target.value) || 0)}
                  />
                  {serie.acertos > serie.tentativas && (
                    <p className="text-xs text-destructive">Acertos não podem exceder tentativas</p>
                  )}
                </div>
              </div>

              {serie.tentativas > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min((serie.acertos / serie.tentativas) * 100, 100)}%`,
                        backgroundColor: tipoColors[serie.tipo_arremesso],
                      }}
                    />
                  </div>
                  <span className="text-sm font-mono text-muted-foreground w-14 text-right">
                    {serie.tentativas > 0 ? `${Math.round((serie.acertos / serie.tentativas) * 100)}%` : "0%"}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        <Button className="w-full gap-2" size="lg" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Treino"}
        </Button>
      </main>
    </div>
  );
};

export default RegistroTreino;
