-- Add 'no_llamado' to call1_status enum
ALTER TYPE call1_status ADD VALUE IF NOT EXISTS 'no_llamado';

-- Add 'no_llamado' to call2_status enum  
ALTER TYPE call2_status ADD VALUE IF NOT EXISTS 'no_llamado';