-- Archivos de hasta 50 MB (máximo del plan gratis de Supabase y del límite de PDF de Gemini)
update storage.buckets set file_size_limit = 52428800 where id = 'documents';
