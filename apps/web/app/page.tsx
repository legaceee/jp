"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getStoredUser, setStoredUser, type AuthUser } from "./utils/auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export default function Home() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      router.replace("/attendance");
    }
  }, [router]);

  const changeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const submitHandler = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Unable to sign in");
      }

      const data = (await response.json()) as { user: AuthUser };
      setStoredUser(data.user);
      router.replace("/attendance");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Sign in failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-zinc-200">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-zinc-800">Welcome Back</h1>

          <p className="text-zinc-500 mt-2">Sign in to continue</p>
        </div>

        <form className="flex flex-col gap-5" onSubmit={submitHandler}>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={changeHandler}
            placeholder="Enter your email"
            className="w-full border border-zinc-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-300 transition"
          />

          <input
            type="password"
            name="password"
            value={form.password}
            onChange={changeHandler}
            placeholder="Enter your password"
            className="w-full border border-zinc-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-300 transition"
          />
          <div className="flex items-center gap-3 p-2 text-sm text-zinc-600">
            <p>Dont have an account?</p>
            <Link className="underline" href="/signup">
              Sign up
            </Link>
          </div>

          {errorMessage ? (
            <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            className="bg-amber-300 hover:bg-amber-400 transition rounded-xl py-3 font-semibold text-zinc-800 disabled:opacity-70"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
