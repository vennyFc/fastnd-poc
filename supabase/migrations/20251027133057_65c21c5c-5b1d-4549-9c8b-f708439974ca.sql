-- Create table for user dashboard settings (widget configurations)
CREATE TABLE IF NOT EXISTS public.user_dashboard_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create table for user project history (recently viewed projects)
CREATE TABLE IF NOT EXISTS public.user_project_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id)
);

-- Create table for user favorites
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'project', 'product', 'collection', etc.
  entity_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);

-- Create table for user column settings (table column configurations)
CREATE TABLE IF NOT EXISTS public.user_column_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, table_name)
);

-- Enable RLS
ALTER TABLE public.user_dashboard_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_project_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_column_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_dashboard_settings
CREATE POLICY "Users can view their own dashboard settings"
  ON public.user_dashboard_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dashboard settings"
  ON public.user_dashboard_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboard settings"
  ON public.user_dashboard_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dashboard settings"
  ON public.user_dashboard_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for user_project_history
CREATE POLICY "Users can view their own project history"
  ON public.user_project_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own project history"
  ON public.user_project_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own project history"
  ON public.user_project_history
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own project history"
  ON public.user_project_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for user_favorites
CREATE POLICY "Users can view their own favorites"
  ON public.user_favorites
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
  ON public.user_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON public.user_favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for user_column_settings
CREATE POLICY "Users can view their own column settings"
  ON public.user_column_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own column settings"
  ON public.user_column_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own column settings"
  ON public.user_column_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own column settings"
  ON public.user_column_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_user_project_history_user_id ON public.user_project_history(user_id);
CREATE INDEX idx_user_project_history_viewed_at ON public.user_project_history(viewed_at DESC);
CREATE INDEX idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX idx_user_favorites_entity ON public.user_favorites(entity_type, entity_id);

-- Add triggers for updated_at
CREATE TRIGGER update_user_dashboard_settings_updated_at
  BEFORE UPDATE ON public.user_dashboard_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_column_settings_updated_at
  BEFORE UPDATE ON public.user_column_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();