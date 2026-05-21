"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("bf_token");
    router.replace(token ? "/conversations" : "/login");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
    </div>
  );
}
