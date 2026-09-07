-- Apply separately before enabling Waiting on vendor in the application.
-- Additive only: existing values, rows, ownership and RLS are unchanged.
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'waiting_on_vendor' BEFORE 'completed';
