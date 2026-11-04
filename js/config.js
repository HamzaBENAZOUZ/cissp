// ============================================================
//  Configuration Supabase
//  Supabase > Project Settings > API :
//    - Project URL          -> SUPABASE_URL
//    - anon / public key    -> SUPABASE_ANON_KEY
//  La clé "anon" est faite pour être publique : la sécurité repose
//  sur les règles RLS de supabase/schema.sql.
//
//  Laissez vide pour le MODE LOCAL (test sur votre PC) : le site lit
//  alors private/questions.json et garde la progression dans le navigateur.
// ============================================================
window.CISSP_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  PASS_MARK: 70,            // % pour considérer un quiz "réussi"
  LOCAL_DATA: "private/questions.json"
};
