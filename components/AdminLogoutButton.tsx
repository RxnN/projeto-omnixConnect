"use client";

import { useState } from "react";

export default function AdminLogoutButton() {
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <button type="button" className="text-blue-600" disabled={loading} onClick={logout}>
      {loading ? "Saindo..." : "Sair"}
    </button>
  );
}
