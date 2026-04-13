import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

        <form
          action={login}
          className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4"
        >
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm text-neutral-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-green-500/50"
              placeholder="tu@email.com"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm text-neutral-300">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-green-500/50"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
