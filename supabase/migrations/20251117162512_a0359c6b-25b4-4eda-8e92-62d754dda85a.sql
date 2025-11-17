-- Add tenant_id column to customer_projects
ALTER TABLE public.customer_projects ADD COLUMN tenant_id UUID;
ALTER TABLE public.customer_projects ADD CONSTRAINT fk_customer_projects_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_customer_projects_tenant_id ON public.customer_projects(tenant_id);

-- Add tenant_id column to applications
ALTER TABLE public.applications ADD COLUMN tenant_id UUID;
ALTER TABLE public.applications ADD CONSTRAINT fk_applications_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_applications_tenant_id ON public.applications(tenant_id);

-- Add tenant_id column to products
ALTER TABLE public.products ADD COLUMN tenant_id UUID;
ALTER TABLE public.products ADD CONSTRAINT fk_products_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_products_tenant_id ON public.products(tenant_id);

-- Add tenant_id column to cross_sells
ALTER TABLE public.cross_sells ADD COLUMN tenant_id UUID;
ALTER TABLE public.cross_sells ADD CONSTRAINT fk_cross_sells_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_cross_sells_tenant_id ON public.cross_sells(tenant_id);

-- Add tenant_id column to product_alternatives
ALTER TABLE public.product_alternatives ADD COLUMN tenant_id UUID;
ALTER TABLE public.product_alternatives ADD CONSTRAINT fk_product_alternatives_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_product_alternatives_tenant_id ON public.product_alternatives(tenant_id);

-- Add tenant_id column to customers
ALTER TABLE public.customers ADD COLUMN tenant_id UUID;
ALTER TABLE public.customers ADD CONSTRAINT fk_customers_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_customers_tenant_id ON public.customers(tenant_id);

-- Add tenant_id column to app_insights
ALTER TABLE public.app_insights ADD COLUMN tenant_id UUID;
ALTER TABLE public.app_insights ADD CONSTRAINT fk_app_insights_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_app_insights_tenant_id ON public.app_insights(tenant_id);

-- Add tenant_id column to collections
ALTER TABLE public.collections ADD COLUMN tenant_id UUID;
ALTER TABLE public.collections ADD CONSTRAINT fk_collections_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_collections_tenant_id ON public.collections(tenant_id);

-- Add tenant_id column to collection_products
ALTER TABLE public.collection_products ADD COLUMN tenant_id UUID;
ALTER TABLE public.collection_products ADD CONSTRAINT fk_collection_products_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_collection_products_tenant_id ON public.collection_products(tenant_id);

-- Add tenant_id column to collection_shares
ALTER TABLE public.collection_shares ADD COLUMN tenant_id UUID;
ALTER TABLE public.collection_shares ADD CONSTRAINT fk_collection_shares_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_collection_shares_tenant_id ON public.collection_shares(tenant_id);

-- Add tenant_id column to action_items
ALTER TABLE public.action_items ADD COLUMN tenant_id UUID;
ALTER TABLE public.action_items ADD CONSTRAINT fk_action_items_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_action_items_tenant_id ON public.action_items(tenant_id);

-- Add tenant_id column to upload_history
ALTER TABLE public.upload_history ADD COLUMN tenant_id UUID;
ALTER TABLE public.upload_history ADD CONSTRAINT fk_upload_history_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_upload_history_tenant_id ON public.upload_history(tenant_id);

-- Add tenant_id column to user_access_logs
ALTER TABLE public.user_access_logs ADD COLUMN tenant_id UUID;
ALTER TABLE public.user_access_logs ADD CONSTRAINT fk_user_access_logs_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_user_access_logs_tenant_id ON public.user_access_logs(tenant_id);

-- Add tenant_id column to user_favorites
ALTER TABLE public.user_favorites ADD COLUMN tenant_id UUID;
ALTER TABLE public.user_favorites ADD CONSTRAINT fk_user_favorites_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_user_favorites_tenant_id ON public.user_favorites(tenant_id);

-- Add tenant_id column to user_project_history
ALTER TABLE public.user_project_history ADD COLUMN tenant_id UUID;
ALTER TABLE public.user_project_history ADD CONSTRAINT fk_user_project_history_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_user_project_history_tenant_id ON public.user_project_history(tenant_id);

-- Add tenant_id column to user_column_settings
ALTER TABLE public.user_column_settings ADD COLUMN tenant_id UUID;
ALTER TABLE public.user_column_settings ADD CONSTRAINT fk_user_column_settings_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_user_column_settings_tenant_id ON public.user_column_settings(tenant_id);

-- Add tenant_id column to user_dashboard_settings
ALTER TABLE public.user_dashboard_settings ADD COLUMN tenant_id UUID;
ALTER TABLE public.user_dashboard_settings ADD CONSTRAINT fk_user_dashboard_settings_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_user_dashboard_settings_tenant_id ON public.user_dashboard_settings(tenant_id);

-- Add tenant_id column to user_notifications
ALTER TABLE public.user_notifications ADD COLUMN tenant_id UUID;
ALTER TABLE public.user_notifications ADD CONSTRAINT fk_user_notifications_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_user_notifications_tenant_id ON public.user_notifications(tenant_id);

-- Add tenant_id column to user_preferences
ALTER TABLE public.user_preferences ADD COLUMN tenant_id UUID;
ALTER TABLE public.user_preferences ADD CONSTRAINT fk_user_preferences_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_user_preferences_tenant_id ON public.user_preferences(tenant_id);