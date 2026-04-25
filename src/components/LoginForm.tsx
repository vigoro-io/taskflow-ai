"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type LoginFormProps = {
  login: (formData: FormData) => Promise<void>;
  error?: string;
};

export default function LoginForm({ login, error }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
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
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 pr-10 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-green-500/50"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-300 transition-colors p-1"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
      >
        Iniciar sesión
      </button>
    </form>
  );
}
