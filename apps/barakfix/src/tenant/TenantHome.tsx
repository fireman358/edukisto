import { useEffect, useState } from "react";
import { TENANT_TOKEN_KEY } from "../lib/api";
import { Property, RepairRequest, STATUS_LABELS, URGENCY_LABELS } from "../types";
import { Badge, Button, Card } from "../components/ui";
import { formatDate } from "../lib/format";

export default function TenantHome({ onNew, onLogout }: { onNew: () => void; onLogout: () => void }) {
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [property, setProperty] = useState<Property | null>(null);
  const [name, setName] = useState(localStorage.getItem("barakfix_tenant_name") || "Locataire");
  const [ownerPhone, setOwnerPhone] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem(TENANT_TOKEN_KEY);
      if (!token) return;
      try {
        const res = await fetch("/api/tenant-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setRequests((data.requests || []).map((r: any) => ({ ...r })));
        setProperty(data.property ? { ...(data.property as any) } : null);
        setOwnerPhone(data.owner_phone || null);
      } catch {
        // silencieux
      }
    })();
  }, []);

  const statusColor: Record<string, string> = {
    nouveau: "bg-purple-100 text-purple-800",
    planifie: "bg-blue-100 text-blue-800",
    en_cours: "bg-yellow-100 text-yellow-800",
    resolu: "bg-green-100 text-green-800",
  };

  function logout() {
    localStorage.removeItem(TENANT_TOKEN_KEY);
    localStorage.removeItem("barakfix_tenant_name");
    onLogout();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">Bonjour {name}</h1>
          {property && <p className="text-slate-500 text-sm">{property.address}</p>}
        </div>
        <button onClick={logout} className="text-sm text-slate-400 underline">
          Se déconnecter
        </button>
      </div>

      {ownerPhone && (
        <Card className="mb-4 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-800">
            📞 Urgence ? Appelez directement votre bailleur :{" "}
            <a href={`tel:${ownerPhone}`} className="font-bold underline">
              {ownerPhone}
            </a>
          </p>
        </Card>
      )}

      <Button onClick={onNew} className="w-full mb-6">
        + Nouvelle demande
      </Button>

      <div className="grid gap-3">
        {requests.map((r) => (
          <Card key={r.id}>
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="font-semibold">{r.title}</div>
                <div className="text-sm text-slate-500">
                  {URGENCY_LABELS[r.urgency]} · mise à jour le {formatDate(r.updated_at)}
                </div>
              </div>
              <Badge color={statusColor[r.status]}>{STATUS_LABELS[r.status]}</Badge>
            </div>
          </Card>
        ))}
        {requests.length === 0 && (
          <p className="text-slate-500">Aucune demande pour l'instant. Signalez votre première panne !</p>
        )}
      </div>
    </div>
  );
}
