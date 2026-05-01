import { redirect } from "next/navigation";

export default function CallbackClientPage() {
  redirect("/login?error=backend_auth_required");
}
