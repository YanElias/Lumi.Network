import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Chaves publishable/anon podem ficar no frontend. Nunca coloque service_role aqui.
// Se seu projeto Supabase mudou, substitua estes dois valores.
const SUPABASE_URL = 'https://yoyayzrmhcmmdjcepdsi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QIahkgMw6vrGYFJwFWG8Yw_FSfoSUeS';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
