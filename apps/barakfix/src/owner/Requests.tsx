import { useEffect, useState } from "react";
import { ownerApi } from "../lib/api";
import { Property, RepairRequest, STATUS_LABELS, URGENCY_LABELS } from "../types";
import { Badge, Card, Select } from "../components/ui";
import { formatDate } from "../lib/format";

export default function Requests({ onOpen }: { onOpen: (id: string) => void }) {
  const [all, setAll] = useState<RepairRequest[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [status, setStatus] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState("");

  async function load() {
    const data = await ownerApi("list_requests", {
      status: status || undefined,
      property_id: propertyId || undefined,
      category: category || undefined,
      urgency: urgency || undefined,
    });
    setAll(data.requests || []);
    setProperties(data.properties || []);
  }

  useEffect(() => {
    load();
  }, [status, propertyId, category, urgency]);

  async function markRead(r: RepairRequest) {
    if (!r.owner_read) {
      await ownerApi("update_request", { id: r.id, owner_read: true });
      load();
    }
    onOpen(r.id);
  }

  const urgencyColor: Record<string, string> = {
    urgente: "bg-red-100 text-red-800",
    haute: "bg-orange-100 text-orange-800",
    normale: "bg-blue-100 text-blue-800",
    basse: "bg-slate-100 text-slate-700",
  };
  const statusColor: Record<string, string> = {
    nouveau: "bg-purple-100 text-purple-800",
    planifie: "bg-blue-100 text-blue-800",
    en_cours: "bg-yellow-100 text-yellow-800",
    resolu: "bg-green-100 text-green-800",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Demandes</h1>

      <Card className="mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Select
            label="Statut"
            value={status}
            onChange={setStatus}
            options={[
              { value: "", label: "Tous" },
              ...Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l })),
            ]}
          />
          <Select
            label="Logement"
            value={propertyId}
            onChange={setPropertyId}
            options={[
              { value: "", label: "Tous" },
              ...properties.map((p) => ({ value: p.id, label: p.address })),
            ]}
          />
          <Select
            label="Catégorie"
            value={category}
            onChange={setCategory}
            options={[
              { value: "", label: "Toutes" },
              { value: "plomberie", label: "Plomberie" },
              { value: "electricite", label: "Électricité" },
              { value: "chauffage", label: "Chauffage" },
              { value: "menuiserie", label: "Menuiserie" },
              { value: "toiture", label: "Toiture" },
              { value: "serrurerie", label: "Serrurerie" },
              { value: "electromenager", label: "Électroménager" },
              { value: "autre", label: "Autre" },
            ]}
          />
          <Select
            label="Urgence"
            value={urgency}
            onChange={setUrgency}
            options={[
              { value: "", label: "Toutes" },
              ...Object.entries(URGENCY_LABELS).map(([v, l]) => ({ value: v, label: l })),
            ]}
          />
        </div>
      </Card>

      <div className="grid gap-3">
        {all.map((r) => (
          <button key={r.id} onClick={() => markRead(r)} className="text-left">
            <Card className="hover:shadow-md transition">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {!r.owner_read && <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />}
                    {r.title}
                  </div>
                  <div className="text-sm text-slate-500">
                    {r.properties?.address} · {r.tenants?.full_name || "—"} · {formatDate(r.created_at)}
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <Badge color={urgencyColor[r.urgency]}>{URGENCY_LABELS[r.urgency]}</Badge>
                  <Badge color={statusColor[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                </div>
              </div>
            </Card>
          </button>
        ))}
        {all.length === 0 && <p className="text-slate-500">Aucune demande ne correspond aux filtres.</p>}
      </div>
    </div>
  );
}
