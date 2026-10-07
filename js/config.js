// js/config.js
// La chiave anon di Supabase è pensata per essere usata nel browser.
// La sicurezza reale dipende dalle policy RLS e dalle autorizzazioni del database.

const SUPABASE_URL = 'https://aatjwdajgdjhtrgisnps.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhdGp3ZGFqZ2RqaHRyZ2lzbnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNDE0MDcsImV4cCI6MjEwNTgxNzQwN30.soROcnzVsc3qx2Fd4Y92DtTyBziK3olKVeuSve7-ug';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const APP_CONFIG = Object.freeze({
  currency: 'EUR',
  locale: 'it-IT',
  maxCartQuantity: 99,
  defaultProductImage: 'https://placehold.co/600x400?text=Sapori+Piceni',
  allowedRoles: Object.freeze(['cliente', 'fornitore', 'admin']),
  clientRoles: Object.freeze(['cliente', 'fornitore'])
});

// Stato globale dell'applicazione
let currentUser = null;
let currentProfile = null;
