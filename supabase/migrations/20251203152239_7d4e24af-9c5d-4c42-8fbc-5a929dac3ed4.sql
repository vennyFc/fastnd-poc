-- Add rec_source and rec_score columns to cross_sells table
ALTER TABLE public.cross_sells 
ADD COLUMN rec_source text,
ADD COLUMN rec_score numeric;