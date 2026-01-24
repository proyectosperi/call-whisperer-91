-- Cambiar recorded_date de DATE a TIMESTAMPTZ
ALTER TABLE public.group_metrics 
  ALTER COLUMN recorded_date TYPE TIMESTAMPTZ USING recorded_date::TIMESTAMPTZ;

-- Actualizar la constraint única para permitir múltiples registros por día
ALTER TABLE public.group_metrics 
  DROP CONSTRAINT IF EXISTS group_metrics_course_id_group_type_recorded_date_key;

-- Agregar índice para mejorar el rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_group_metrics_course_group_date 
  ON public.group_metrics(course_id, group_type, recorded_date DESC);

-- Actualizar el valor por defecto para usar la fecha y hora actual
ALTER TABLE public.group_metrics 
  ALTER COLUMN recorded_date SET DEFAULT NOW();
