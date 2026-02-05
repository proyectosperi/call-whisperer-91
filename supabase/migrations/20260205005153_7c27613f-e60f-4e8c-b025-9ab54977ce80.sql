-- Update default values for the status columns to 'no_llamado'
ALTER TABLE call1_records ALTER COLUMN status SET DEFAULT 'no_llamado';
ALTER TABLE call2_records ALTER COLUMN status SET DEFAULT 'no_llamado';