import { useEffect, useState } from "react";
import { ownerApi } from "../lib/api";
import { Intervention, Property, RepairRequest, STATUS_LABELS, URGENCY_ORDER } from "../types";
import { Button, Card } from "../components/ui";
import { formatEUR } from "../lib/format";
import { downloadCSV } from "../lib/csv";

export default function Dashboard({ onGoRequests }: { onGoRequests: () => void }) {
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await ownerApi("dashboard");
        setRequests(data.requests || []);
        setProperties(data.properties || []);
        setInterventions((data.interventions || []) as any);
      } catch (e: any) {
        console.error(e);
      }
    })();
  }, []);

  const open = requests.filter((r) => r.status !== "resolu");
  const unread = requests.filter((r) => !r.owner_read);
  const urgentOpen = open
    .filter((r) => r.urgency === "urgente" || r.urgency === "haute")
    .sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]);
  const resolved = requests.filter((r) => r.status === "resolu");
  const resolutionRate = requests.length ? Math.round((resolved.length / requests.length) * 100) : 0;

  const costsByProperty: Record<string, number> = {};
  for (const i of interventions) {
    if (i.cost) {
      const pid = (i as any).requests?.property_id;
      if (pid) costsByProperty[pid] = (costsByProperty[pid] || 0) + Number(i.cost);
    }
  }

  function exportHistory() {
    const rows: (string | number | null)[][] = [
      ["Titre", "Logement", "Catégorie", "Urgence", "Statut", "Créée le", "Mise à jour", "Coût EUR"],
      ...requests.map((r) => {
        const it = interventions.find((i) => i.request_id === r.id);
        return [
          r.title,
          r.properties?.address || "",
          r.category,
          r.urgency,
          STATUS_LABELS[r.status],
          new Date(r.created_at).toLocaleDateString("fr-BE"),
          new Date(r.updated_at).toLocaleDateString("fr-BE"),
          it?.cost ?? "",
        ];
      }),
    ];
    downloadCSV(`barakfix-historique-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  function exportCosts() {
    const year = new Date().getFullYear();
    const rows: (string | number | null)[][] = [
      ["Logement", `Coûts cumulés ${year}`, "Total toutes années"],
      ...properties.map((p) => {
        const total = interventions
          .filter((i) => (i as any).requests?.property_id === p.id && i.cost)
          .reduce((s, i) => s + Number(i.cost), 0);
        return [p.address, total, total];
      }),
    ];
    downloadCSV(`barakfix-couts-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Tableau de bord</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card>
          <div className="text-3xl font-bold">{open.length}</div>
          <div className="text-sm text-slate-500">demandes ouvertes</div>
        </Card>
        <Card>
          <div className="text-3xl font-bold text-red-600">{unread.length}</div>
          <div className="text-sm text-slate-500">non lues</div>
        </Card>
        <Card>
          <div className="text-3xl font-bold">{resolutionRate}%</div>
          <div className="text-sm text-slate-500">taux de résolution</div>
        </Card>
        <Card>
          <div className="text-3xl font-bold">
            {formatEUR(Object.values(costsByProperty).reduce((a, b) => a + b, 0))}
          </div>
          <div className="text-sm text-slate-500">coûts cumulés</div>
        </Card>
      </div>

      {unread.length > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <div className="flex justify-between items-center">
            <p className="font-semibold text-red-800">🔔 {unread.length} demande(s) non lue(s)</p>
            <Button onClick={onGoRequests}>Voir</Button>
          </div>
        </Card>
      )}

      {urgentOpen.length > 0 && (
        <Card className="mb-6">
          <h2 className="font-semibold mb-3">Urgences non traitées</h2>
          <div className="grid gap-2">
            {urgentOpen.map((r) => (
              <button key={r.id} onClick={onGoRequests} className="text-left">
                <div className={`p-3 rounded-lg ${r.urgency === "urgente" ? "bg-red-100" : "bg-orange-100"}`}>
                  <span className="font-semibold">{r.title}</span>
                  <span className="text-sm text-slate-600"> — {r.properties?.address}</span>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card className="mb-6">
        <h2 className="font-semibold mb-3">Coûts par logement</h2>
        {properties.map((p) => (
          <div key={p.id} className="flex justify-between py-1 border-b border-slate-100 last:border-0">
            <span>{p.address}</span>
            <span className="font-medium">{formatEUR(costsByProperty[p.id] || 0)}</span>
          </div>
        ))}
        {properties.length === 0 && <p className="text-slate-500">Aucun logement.</p>}
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={exportHistory}>
          📄 Export CSV historique
        </Button>
        <Button variant="secondary" onClick={exportCosts}>
          💶 Export CSV coûts
        </Button>
      </div>
    </div>
  );
}
