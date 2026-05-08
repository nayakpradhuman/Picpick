import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jvafiordafklcujvwgsb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2YWZpb3JkYWZrbGN1anZ3Z3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNjYyNjksImV4cCI6MjA5Mzg0MjI2OX0.A0wdnL-5HSPeep2iLK4qpSkyeYxk5Hqt92waVvUo4T0";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
