import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Klient używany po stronie przeglądarki i w Server Components / Route Handlers
// (klucz publishable/anon jest bezpieczny do ujawnienia, dostęp kontrolują
// polityki RLS ustawione w Supabase).
export const supabase = createClient(url, anonKey);

export const DEFAULT_PROJECT_SLUG = "ryszard-petru";
