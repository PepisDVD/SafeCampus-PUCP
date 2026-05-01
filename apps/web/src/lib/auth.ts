import { createBrowserClient } from "@safecampus/data";

import {
  ALLOWED_INSTITUTIONAL_DOMAIN,
  isAllowedInstitutionalEmail,
} from "@/features/auth/auth.policy";

type SignInWithPucpSsoOptions = {
  email: string;
  nextPath: string;
};

export async function signInWithPucpSso({
  email,
  nextPath,
}: SignInWithPucpSsoOptions): Promise<void> {
  const supabase = createBrowserClient();
  const normalizedEmail = email.trim().toLowerCase();
  if (!isAllowedInstitutionalEmail(normalizedEmail)) {
    throw new Error(
      `Solo se permite el acceso con correos institucionales @${ALLOWED_INSTITUTIONAL_DOMAIN}`,
    );
  }

  const safeNextPath =
    nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/dashboard";
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNextPath)}`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        hd: ALLOWED_INSTITUTIONAL_DOMAIN,
        prompt: "select_account",
        login_hint: normalizedEmail,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signOut(): Promise<unknown> {
  const supabase = createBrowserClient();
  return supabase.auth.signOut();
}

export { isAllowedInstitutionalEmail };
