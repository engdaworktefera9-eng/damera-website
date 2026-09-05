/* ============================================================
   DAMERA — DATABASE CONNECTION (one-time setup, ~5 minutes)
   ============================================================
   Step-by-step:

   1. Create a free account at https://supabase.com (use Google login)
   2. Create a new project called "damera"
   3. Run the SQL from  supabase-setup.sql  inside the SQL Editor
   4. Create your admin login (Authentication -> Users -> Add user)
   5. Copy the two values below from  Settings -> API

   - "Project URL"  ->  goes in  supabaseUrl
   - "anon public" key  ->  goes in  supabaseAnonKey

   The "anon" key is designed to be public — it is safe here.
   NEVER put the "service_role" key in this file or any website file.
   ============================================================ */

window.DAMERA_CONFIG = {
  supabaseUrl: '',      // example: 'https://abcdefghijk.supabase.co'
  supabaseAnonKey: ''   // example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...'
};