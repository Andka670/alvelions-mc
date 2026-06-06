const SUPABASE_URL = "https://azynaphouwbefefmnrcc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6eW5hcGhvdXdiZWZlZm1ucmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMjU0ODksImV4cCI6MjA5NTcwMTQ4OX0.Oy1vXdxQi9gBnfEtotFcAMkeHXyHFk2gS8BUFdrz4fI";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
