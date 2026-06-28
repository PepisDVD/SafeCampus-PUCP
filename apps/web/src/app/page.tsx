import { redirect } from "next/navigation";

const BACKEND_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000/api/v1";

type HomePageProps = {
  searchParams: Promise<{
    code?: string;
    error?: string;
    error_code?: string;
    error_description?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  if (params.code) {
    const callbackUrl = new URL(
      `${BACKEND_URL.replace(/\/$/, "")}/auth/google/callback`,
    );
    callbackUrl.searchParams.set("code", params.code);
    redirect(callbackUrl.toString());
  }

  if (params.error || params.error_code) {
    const loginUrl = new URL("/login", "http://safecampus.local");
    loginUrl.searchParams.set(
      "error",
      params.error_code ?? params.error ?? "oauth_exchange_failed",
    );
    redirect(`${loginUrl.pathname}${loginUrl.search}`);
  }

  redirect("/dashboard");
}
