"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    try {
      if (isRegister) {
        const fullName = form.get("full_name") as string;
        const businessName = form.get("business_name") as string;
        const res = await api.post<{ access_token: string }>("/auth/register", {
          email,
          password,
          full_name: fullName,
          business_name: businessName,
        });
        localStorage.setItem("bf_token", res.access_token);
      } else {
        const res = await api.post<{ access_token: string }>("/auth/login", {
          email,
          password,
        });
        localStorage.setItem("bf_token", res.access_token);
      }
      router.push("/conversations");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-brand-700">BuckFlow AI</h1>
          <p className="mt-2 text-sm text-gray-500">
            WhatsApp Sales & Support for Nigerian Businesses
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <input
                name="full_name"
                type="text"
                placeholder="Full Name"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <input
                name="business_name"
                type="text"
                placeholder="Business Name"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </>
          )}
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            minLength={6}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : isRegister
                ? "Create Account"
                : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            className="font-semibold text-brand-600 hover:underline"
          >
            {isRegister ? "Sign In" : "Register"}
          </button>
        </p>
      </div>
    </div>
  );
}
