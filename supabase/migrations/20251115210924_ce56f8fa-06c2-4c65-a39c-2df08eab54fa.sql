-- Add CASCADE DELETE for customers table
ALTER TABLE customers 
ADD CONSTRAINT customers_upload_id_fkey 
FOREIGN KEY (upload_id) 
REFERENCES upload_history(id) 
ON DELETE CASCADE;

-- Add CASCADE DELETE for app_insights table
ALTER TABLE app_insights 
ADD CONSTRAINT app_insights_upload_id_fkey 
FOREIGN KEY (upload_id) 
REFERENCES upload_history(id) 
ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_upload_id ON customers(upload_id);
CREATE INDEX IF NOT EXISTS idx_app_insights_upload_id ON app_insights(upload_id);