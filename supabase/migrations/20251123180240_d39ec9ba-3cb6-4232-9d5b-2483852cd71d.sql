-- Add 'Abgelehnt' to the product_optimization_status enum
ALTER TYPE product_optimization_status ADD VALUE IF NOT EXISTS 'Abgelehnt';