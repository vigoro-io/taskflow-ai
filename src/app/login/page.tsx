import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "@/components/LoginForm";

async function login(formData: FormData) {
  "use server";

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) redirect("/login?error=Credenciales incorrectas");

  redirect("/dashboard");
}

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a] px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="size-8 rounded bg-green-500 flex items-center justify-center text-white text-sm font-bold">
            T
          </div>
          <span className="text-white font-semibold text-2xl">
            TaskFlow <span className="text-neutral-400 font-normal">AI</span>
          </span>
        </div>

        <LoginForm login={login} error={error} />
      </div>
    </div>
  );
}
