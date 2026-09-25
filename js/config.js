// js/config.js

const SUPABASE_URL = 'https://aatjwdajgdjhtrgisnps.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhdGp3ZGFqZ2RqaHRyZ2lzbnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNDE0MDcsImV4cCI6MjEwNTgxNzQwN30.soROcnzVsc3qx2Fd4Y92DtTyBziK3olKVeUuSve7-ug';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Stato globale dell'applicazione
let currentUser = null;
let currentProfile = null;
