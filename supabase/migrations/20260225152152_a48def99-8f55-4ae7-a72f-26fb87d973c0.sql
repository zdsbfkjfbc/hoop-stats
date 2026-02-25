
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Treinos table
CREATE TABLE public.treinos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.treinos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own treinos" ON public.treinos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own treinos" ON public.treinos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own treinos" ON public.treinos FOR DELETE USING (auth.uid() = user_id);

-- Series table
CREATE TABLE public.series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  treino_id UUID REFERENCES public.treinos(id) ON DELETE CASCADE NOT NULL,
  tipo_arremesso TEXT NOT NULL CHECK (tipo_arremesso IN ('2PT', '3PT', 'FT')),
  numero_serie INTEGER NOT NULL,
  tentativas INTEGER NOT NULL CHECK (tentativas > 0),
  acertos INTEGER NOT NULL CHECK (acertos >= 0),
  percentual NUMERIC(5,2) NOT NULL
);

ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own series" ON public.series FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.treinos WHERE treinos.id = series.treino_id AND treinos.user_id = auth.uid())
);
CREATE POLICY "Users can insert own series" ON public.series FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.treinos WHERE treinos.id = series.treino_id AND treinos.user_id = auth.uid())
);
CREATE POLICY "Users can delete own series" ON public.series FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.treinos WHERE treinos.id = series.treino_id AND treinos.user_id = auth.uid())
);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', ''), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
