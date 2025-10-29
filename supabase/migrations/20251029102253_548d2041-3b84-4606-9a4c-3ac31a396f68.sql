-- Add upload_id column to all data tables to track which upload they came from
ALTER TABLE customer_projects ADD COLUMN upload_id uuid REFERENCES upload_history(id) ON DELETE CASCADE;
ALTER TABLE applications ADD COLUMN upload_id uuid REFERENCES upload_history(id) ON DELETE CASCADE;
ALTER TABLE products ADD COLUMN upload_id uuid REFERENCES upload_history(id) ON DELETE CASCADE;
ALTER TABLE cross_sells ADD COLUMN upload_id uuid REFERENCES upload_history(id) ON DELETE CASCADE;
ALTER TABLE product_alternatives ADD COLUMN upload_id uuid REFERENCES upload_history(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_customer_projects_upload_id ON customer_projects(upload_id);
CREATE INDEX idx_applications_upload_id ON applications(upload_id);
CREATE INDEX idx_products_upload_id ON products(upload_id);
CREATE INDEX idx_cross_sells_upload_id ON cross_sells(upload_id);
CREATE INDEX idx_product_alternatives_upload_id ON product_alternatives(upload_id);