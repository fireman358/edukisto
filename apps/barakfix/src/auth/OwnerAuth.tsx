import { useState } from "react";
import { ownerSignIn, ownerSignUp } from "../lib/api";
import { Button, ErrorMsg, Input } from "../components/ui";

export default function OwnerAuth({ onBack, onLoggedIn }: { onBack: () => void; onLoggedIn?: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        await ownerSignUp(email, password, fullName);
      } else {
        await ownerSignIn(email, password);
      }
      onLoggedIn?.();
    } catch (e: any) {
      setError(e.message === "Invalid login credentials" ? "Email ou mot de passe incorrect." : e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow p-6 w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4">
          {mode === "login" ? "Connexion bailleur" : "Inscription bailleur"}
        </h1>
        {mode === "signup" && (
          <Input label="Nom complet" value={fullName} onChange={setFullName} required />
        )}
        <Input label="Email" type="email" value={email} onChange={setEmail} required />
        <Input label="Mot de passe" type="password" value={password} onChange={setPassword} required />
        <ErrorMsg>{error}</ErrorMsg>
        <Button onClick={submit} disabled={loading} className="w-full">
          {loading ? "…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
        </Button>
        <button
          className="mt-4 text-sm text-slate-500 underline"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
        </button>
        <button className="mt-2 block text-sm text-slate-400 underline" onClick={onBack}>
          ← Retour
        </button>
      </div>
    </div>
  );
}

export function ForgotPassword({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow p-6 w-full max-w-sm">
        <h1 className="text-xl font-bold mb-3">Mot de passe oublié</h1>
        <p className="text-slate-600 text-sm mb-4">
          Pour des raisons de sécurité et de simplicité, la réinitialisation se fait avec le support :
          contactez le support Barakfix depuis l'adresse email de votre compte. Aucun email n'est envoyé
          automatiquement.
        </p>
        <Button variant="secondary" onClick={onBack} className="w-full">
          ← Retour à la connexion
        </Button>
      </div>
    </div>
  );
}
