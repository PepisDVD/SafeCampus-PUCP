import { supabase } from "@safecampus/data";

export async function signInWithInstitutionalEmail(
  email: string,
): Promise<unknown> {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${window.location.origin}/dashboard`,
    },
  });
}

export async function signOut(): Promise<unknown> {
  return supabase.auth.signOut();
}
