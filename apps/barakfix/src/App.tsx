import { useEffect, useState } from "react";
import GateScreen from "./auth/GateScreen";
import OwnerAuth, { ForgotPassword } from "./auth/OwnerAuth";
import TenantLogin from "./auth/TenantLogin";
import Dashboard from "./owner/Dashboard";
import Properties from "./owner/Properties";
import Tenants from "./owner/Tenants";
import Requests from "./owner/Requests";
import RequestDetail from "./owner/RequestDetail";
import TenantHome from "./tenant/TenantHome";
import NewRequest from "./tenant/NewRequest";
import { TENANT_TOKEN_KEY, getOwnerToken, clearOwnerToken, ownerApi } from "./lib/api";
import { Button, ErrorMsg, Input } from "./components/ui";

type Screen =
  | "gate"
  | "owner-auth"
  | "forgot"
  | "tenant-login"
  | "dashboard"
  | "properties"
  | "tenants"
  | "requests"
  | "request-detail"
  | "tenant-home"
  | "tenant-new";

export default function App() {
  return <Main />;
}

function Main() {
  const [screen, setScreen] = useState<Screen>("gate");
  const [session, setSession] = useState<boolean>(!!getOwnerToken());
  const [requestId, setRequestId] = useState("");
  const [nav, setNav] = useState<"dashboard" | "properties" | "tenants" | "requests">("dashboard");
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  useEffect(() => {
    const token = getOwnerToken();
    if (!token) {
      setSession(false);
      return;
    }
    ownerApi("me")
      .then(() => setSession(true))
      .catch(() => {
        clearOwnerToken();
        setSession(false);
      });
  }, []);

  const ownerScreens: Screen[] = ["dashboard", "properties", "tenants", "requests", "request-detail"];
  if (session && (screen === "gate" || screen === "owner-auth" || screen === "forgot")) {
    setScreen("dashboard");
  }
  if (!session && ownerScreens.includes(screen) && !localStorage.getItem(TENANT_TOKEN_KEY)) {
    return (
      <Shell>
        <OwnerAuth onBack={() => setScreen("gate")} onLoggedIn={() => { setSession(true); setScreen("dashboard"); }} />
      </Shell>
    );
  }

  function setOwnerNav(s: typeof nav) {
    setNav(s);
    setScreen(s);
  }

  return (
    <Shell>
      {(screen === "dashboard" ||
        screen === "properties" ||
        screen === "tenants" ||
        screen === "requests" ||
        screen === "request-detail") && (
        <OwnerShell
          nav={nav}
          onNav={setOwnerNav}
          session={!!session}
          onShowPasswordChange={() => setShowPasswordChange(true)}
          onLogout={() => {
            clearOwnerToken();
            setSession(false);
            setScreen("gate");
          }}
        >
          {screen === "dashboard" && <Dashboard onGoRequests={() => setOwnerNav("requests")} />}
          {screen === "properties" && <Properties />}
          {screen === "tenants" && <Tenants />}
          {screen === "requests" && <Requests onOpen={(id) => { setRequestId(id); setScreen("request-detail"); }} />}
          {screen === "request-detail" && <RequestDetail id={requestId} onBack={() => setOwnerNav("requests")} />}
          {showPasswordChange && (
            <PasswordChangeModal onClose={() => setShowPasswordChange(false)} />
          )}
        </OwnerShell>
      )}

      {screen === "gate" && <GateScreen onChoice={(r) => setScreen(r === "bailleur" ? "owner-auth" : "tenant-login")} />}
      {screen === "owner-auth" && (
        <OwnerAuth onBack={() => setScreen("gate")} onLoggedIn={() => { setSession(true); setScreen("dashboard"); }} />
      )}
      {screen === "forgot" && <ForgotPassword onBack={() => setScreen("owner-auth")} />}
      {screen === "tenant-login" && (
        <TenantLogin onBack={() => setScreen("gate")} onLoggedIn={() => setScreen("tenant-home")} />
      )}
      {screen === "tenant-home" && (
        <TenantHome onNew={() => setScreen("tenant-new")} onLogout={() => setScreen("gate")} />
      )}
      {screen === "tenant-new" && <NewRequest onDone={() => setScreen("tenant-home")} />}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-3xl mx-auto p-4 sm:p-6">{children}</div>
      <footer className="pb-4 text-center">
        <a
          href="https://edukisto.win/"
          target="_blank"
          rel="noopener"
          className="text-[12px] text-slate-400 hover:text-[#0e7490] transition-colors tracking-wide"
          title="edukisto — relier & orienter"
        >
          <span className="opacity-50 tracking-tighter">──</span>{" "}
          <svg width="13" height="13" viewBox="0 0 64 64" className="inline align-[-2px]" aria-hidden="true">
            <path d="M32 3l5.2 18.2 10.8-5.2-5.2 10.8L61 32l-18.2 5.2 5.2 10.8-10.8-5.2L32 61l-5.2-18.2-10.8 5.2 5.2-10.8L3 32l18.2-5.2-5.2-10.8 10.8 5.2z" fill="currentColor" />
          </svg>{" "}
          edukisto{" "}
          <span className="opacity-50 tracking-tighter">──</span>
        </a>
      </footer>
    </div>
  );
}

async function deleteOwnerAccount(): Promise<boolean> {
  if (!confirm(
    "Supprimer définitivement votre compte bailleur ?\n\nTous vos logements, locataires et demandes seront également supprimés. Cette action est irréversible."
  )) {
    return false;
  }
  const owner_token = getOwnerToken();
  if (!owner_token) return false;
  try {
    const res = await fetch("/api/owner-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner_token }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Suppression impossible");
      return false;
    }
    clearOwnerToken();
    return true;
  } catch (e: any) {
    alert(e.message);
    return false;
  }
}

function PasswordChangeModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setError("");
    if (next !== confirm) {
      setError("Le nouveau mot de passe et sa confirmation ne correspondent pas.");
      return;
    }
    setSaving(true);
    try {
      await ownerApi("change_password", { current_password: current, new_password: next });
      alert("Mot de passe modifié ✅");
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold mb-4">Changer mon mot de passe</h2>
        <Input label="Mot de passe actuel" type="password" value={current} onChange={setCurrent} required />
        <Input label="Nouveau mot de passe" type="password" value={next} onChange={setNext} required />
        <Input label="Confirmer le nouveau mot de passe" type="password" value={confirm} onChange={setConfirm} required />
        <ErrorMsg>{error}</ErrorMsg>
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving || !current || next.length < 6 || !confirm} className="flex-1">
            {saving ? "…" : "Enregistrer"}
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
}

function OwnerShell({
  nav,
  onNav,
  children,
  onShowPasswordChange,
  onLogout,
}: {
  nav: "dashboard" | "properties" | "tenants" | "requests";
  onNav: (s: "dashboard" | "properties" | "tenants" | "requests") => void;
  children: React.ReactNode;
  session: boolean;
  onShowPasswordChange: () => void;
  onLogout: () => void;
}) {
  const tabs = [
    { id: "dashboard", label: "🏠 Tableau de bord" },
    { id: "properties", label: "🏘 Logements" },
    { id: "tenants", label: "👥 Locataires" },
    { id: "requests", label: "📋 Demandes" },
  ] as const;
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold text-slate-800">Barakfix</h1>
        <div className="flex gap-3 items-center">
          <button
            onClick={onShowPasswordChange}
            className="text-sm text-slate-500 underline hover:text-slate-800"
          >
            🔑 Mot de passe
          </button>
          <button
            onClick={async () => {
              const ok = await deleteOwnerAccount();
              if (ok) onLogout();
            }}
            className="text-sm text-red-400 underline hover:text-red-600"
          >
            Supprimer mon compte
          </button>
          <button onClick={onLogout} className="text-sm text-slate-400 underline">
            Déconnexion
          </button>
        </div>
      </div>
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onNav(t.id)}
            className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
              nav === t.id ? "bg-slate-800 text-white" : "bg-white text-slate-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
