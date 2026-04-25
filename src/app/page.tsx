import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si el usuario está autenticado, redirigir al dashboard
  if (user) {
    redirect("/dashboard");
  }

  // Si no está autenticado, redirigir al login
  redirect("/login");
}
