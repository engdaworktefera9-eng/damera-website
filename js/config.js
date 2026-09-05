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
  supabaseUrl: '',  https://ehzjzfogzebqlmhtqned.supabase.co '
  supabaseAnonKey: ''  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoemp6Zm9nemVicWxtaHRxbmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NjE4NTcsImV4cCI6MjEwNDEzNzg1N30.yxLIRl_QQphI8WRvFUdj54Cr-x5MNIM6HPguhwmz1Wg'
};
