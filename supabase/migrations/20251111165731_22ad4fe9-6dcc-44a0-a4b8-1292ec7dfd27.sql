-- Create enums for optimization statuses
CREATE TYPE public.optimization_status AS ENUM ('Neu', 'Offen', 'Prüfung', 'Validierung', 'Abgeschlossen');
CREATE TYPE public.product_optimization_status AS ENUM ('Identifiziert', 'Vorgeschlagen', 'Akzeptiert', 'Registriert');

-- Create opps_optimization table
CREATE TABLE public.opps_optimization (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  project_number text NOT NULL,
  optimization_status optimization_status NOT NULL DEFAULT 'Neu',
  cross_sell_product_name text,
  cross_sell_date_added timestamp with time zone,
  cross_sell_status product_optimization_status,
  alternative_product_name text,
  alternative_date_added timestamp with time zone,
  alternative_status product_optimization_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fk_project_number FOREIGN KEY (project_number) 
    REFERENCES public.customer_projects(project_number) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.opps_optimization ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own optimization records"
ON public.opps_optimization
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own optimization records"
ON public.opps_optimization
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own optimization records"
ON public.opps_optimization
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own optimization records"
ON public.opps_optimization
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_opps_optimization_updated_at
BEFORE UPDATE ON public.opps_optimization
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_opps_optimization_project_number ON public.opps_optimization(project_number);
CREATE INDEX idx_opps_optimization_user_id ON public.opps_optimization(user_id);