
-- Add call_type column to distinguish call1 vs call2 contacts
ALTER TABLE public.contacts 
ADD COLUMN call_type smallint NOT NULL DEFAULT 1;

-- Drop old unique constraint
ALTER TABLE public.contacts 
DROP CONSTRAINT contacts_country_code_phone_number_course_id_key;

-- Create new unique constraint including call_type
ALTER TABLE public.contacts 
ADD CONSTRAINT contacts_phone_course_calltype_key 
UNIQUE (phone_number, course_id, call_type);
