-- =============================================================
-- 0005_admin_panel: reserve the ADMIN enum value
-- =============================================================
-- PostgreSQL requires a newly-added enum value to be committed before it
-- can be referenced. The functions/policies that use ADMIN therefore live
-- in a later migration.

DO $$ BEGIN
  ALTER TYPE public.tipo_usuario ADD VALUE 'ADMIN';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
