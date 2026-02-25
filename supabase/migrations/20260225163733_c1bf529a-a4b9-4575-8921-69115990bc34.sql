CREATE OR REPLACE FUNCTION public.recalcular_metricas_treino()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_treino_id uuid;
  v_total_tent integer;
  v_total_acer integer;
  v_pont integer;
  v_aprov numeric(5,2);
  v_efg numeric(5,4);
  v_consist numeric(7,4);
  v_tend text;
  v_stddev numeric;
  v_prev_aprov numeric;
BEGIN
  v_treino_id := COALESCE(NEW.treino_id, OLD.treino_id);

  SELECT
    COALESCE(SUM(s.tentativas), 0),
    COALESCE(SUM(s.acertos), 0)
  INTO v_total_tent, v_total_acer
  FROM public.series s
  WHERE s.treino_id = v_treino_id;

  SELECT COALESCE(SUM(
    CASE s.tipo_arremesso
      WHEN '2PT' THEN s.acertos * 2
      WHEN '3PT' THEN s.acertos * 3
      WHEN 'FT'  THEN s.acertos * 1
      ELSE 0
    END
  ), 0)
  INTO v_pont
  FROM public.series s
  WHERE s.treino_id = v_treino_id;

  IF v_total_tent > 0 THEN
    v_aprov := ROUND((v_total_acer::numeric / v_total_tent) * 100, 2);
  ELSE
    v_aprov := NULL;
  END IF;

  DECLARE
    v_fg_made integer;
    v_fg_att integer;
    v_3pm integer;
  BEGIN
    SELECT
      COALESCE(SUM(CASE WHEN s.tipo_arremesso IN ('2PT','3PT') THEN s.acertos ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN s.tipo_arremesso IN ('2PT','3PT') THEN s.tentativas ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN s.tipo_arremesso = '3PT' THEN s.acertos ELSE 0 END), 0)
    INTO v_fg_made, v_fg_att, v_3pm
    FROM public.series s
    WHERE s.treino_id = v_treino_id;

    IF v_fg_att > 0 THEN
      v_efg := ROUND((v_fg_made + 0.5 * v_3pm)::numeric / v_fg_att, 4);
    ELSE
      v_efg := NULL;
    END IF;
  END;

  SELECT COALESCE(STDDEV_POP(s.percentual), 0)
  INTO v_stddev
  FROM public.series s
  WHERE s.treino_id = v_treino_id;

  IF v_total_tent > 0 THEN
    v_consist := ROUND(GREATEST(100 - v_stddev, 0), 4);
  ELSE
    v_consist := NULL;
  END IF;

  SELECT ROUND((SUM(s2.acertos)::numeric / NULLIF(SUM(s2.tentativas), 0)) * 100, 2)
  INTO v_prev_aprov
  FROM public.treinos t2
  JOIN public.series s2 ON s2.treino_id = t2.id
  WHERE t2.user_id = (SELECT user_id FROM public.treinos WHERE id = v_treino_id)
    AND t2.data < (SELECT data FROM public.treinos WHERE id = v_treino_id)
  GROUP BY t2.id
  ORDER BY t2.data DESC
  LIMIT 1;

  IF v_prev_aprov IS NULL OR v_aprov IS NULL THEN
    v_tend := 'neutra';
  ELSIF v_aprov > v_prev_aprov THEN
    v_tend := 'positiva';
  ELSIF v_aprov < v_prev_aprov THEN
    v_tend := 'negativa';
  ELSE
    v_tend := 'neutra';
  END IF;

  UPDATE public.treinos SET
    total_tentativas = v_total_tent,
    total_acertos = v_total_acer,
    pontuacao_total = v_pont,
    aproveitamento_geral = v_aprov,
    efg = v_efg,
    consistencia = v_consist,
    tendencia = v_tend
  WHERE id = v_treino_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;