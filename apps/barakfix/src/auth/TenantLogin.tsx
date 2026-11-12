import { useState } from "react";
import { Button, ErrorMsg, Input } from "../components/ui";
import { TENANT_TOKEN_KEY } from "../lib/api";

export default function TenantLogin({ onBack, onLoggedIn }: { onBack: () => void; onLoggedIn: () => void }) {
  const [accessCode, setAccessCode] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/tenant-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_code: accessCode, email, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connexion impossible");
      localStorage.setItem(TENANT_TOKEN_KEY, data.token);
      localStorage.setItem("barakfix_tenant_name", data.tenant.full_name);
      onLoggedIn();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow p-6 w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4">Accès locataire</h1>
        <Input
          label="Code logement (ex. BRU-HAU-12)"
          value={accessCode}
          onChange={(v) => setAccessCode(v.toUpperCase())}
          placeholder="BRU-HAU-12"
          required
        />
        <Input label="Votre email" type="email" value={email} onChange={setEmail} required />
        <Input label="PIN (4 chiffres)" type="password" value={pin} onChange={(v) => setPin(v.replace(/\D/g, "").slice(0, 4))} required />
        <ErrorMsg>{error}</ErrorMsg>
        <Button
          onClick={submit}
          disabled={loading || pin.length !== 4 || !accessCode || !email}
          className="w-full"
        >
          {loading ? "…" : "Entrer"}
        </Button>
        <button className="mt-4 block text-sm text-slate-400 underline" onClick={onBack}>
          ← Retour
        </button>
      </div>
    </div>
  );
}
