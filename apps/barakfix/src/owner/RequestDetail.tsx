import { useEffect, useState } from "react";
import { ownerApi } from "../lib/api";
import {
  CATEGORY_LABELS,
  Intervention,
  RepairRequest,
  RequestPhoto,
  STATUS_LABELS,
  URGENCY_LABELS,
} from "../types";
import { Button, Card, ErrorMsg, Input, Select } from "../components/ui";
import { formatDate, formatDateShort } from "../lib/format";

export default function RequestDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [request, setRequest] = useState<RepairRequest | null>(null);
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [photos, setPhotos] = useState<RequestPhoto[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState("");
  const [artisanName, setArtisanName] = useState("");
  const [artisanPhone, setArtisanPhone] = useState("");
  const [cost, setCost] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [performedDate, setPerformedDate] = useState("");

  async function load() {
    const data = await ownerApi("get_request", { id });
    const r = data.request;
    if (r) {
      setRequest(r);
      setStatus(r.status);
      if (!r.owner_read) {
        await ownerApi("update_request", { id, owner_read: true });
      }
    }
    const i = data.intervention;
    if (i) {
      setIntervention(i);
      setArtisanName(i.artisan_name || "");
      setArtisanPhone(i.artisan_phone || "");
      setCost(i.cost ? String(i.cost) : "");
      setScheduledDate(i.scheduled_date || "");
      setPerformedDate(i.performed_date || "");
    }
    setPhotos(data.photos || []);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function save() {
    setError("");
    setSaving(true);
    try {
      await ownerApi("update_request", { id, status, updated_at: new Date().toISOString() });

      await ownerApi("save_intervention", {
        request_id: id,
        artisan_name: artisanName || null,
        artisan_phone: artisanPhone || null,
        cost: cost ? parseFloat(cost) : null,
        scheduled_date: scheduledDate || null,
        performed_date: performedDate || null,
      });
      await load();
      onBack();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!request) return <p>Chargement…</p>;

  return (
    <div>
      <button className="text-slate-500 underline text-sm mb-3" onClick={onBack}>
        ← Retour aux demandes
      </button>
      <h1 className="text-2xl font-bold mb-2">{request.title}</h1>
      <p className="text-slate-500 mb-4">
        {request.properties?.address} · {request.tenants?.full_name || "—"} · créée le {formatDate(request.created_at)}
      </p>

      <Card className="mb-4">
        <div className="flex gap-2 mb-3 flex-wrap">
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs">{CATEGORY_LABELS[request.category]}</span>
          <span className="px-2 py-0.5 rounded-full bg-orange-100 text-xs">{URGENCY_LABELS[request.urgency]}</span>
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-xs">{STATUS_LABELS[request.status]}</span>
        </div>
        <p className="text-slate-700 whitespace-pre-wrap">{request.description}</p>
      </Card>

      {photos.length > 0 && (
        <Card className="mb-4">
          <h2 className="font-semibold mb-2">Photos</h2>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <img
                key={p.id}
                src={`/api/photo/${p.id}`}
                className="w-full rounded-lg"
              />
            ))}
          </div>
        </Card>
      )}

      <Card className="mb-4">
        <h2 className="font-semibold mb-3">Traitement</h2>
        <Select
          label="Statut"
          value={status}
          onChange={setStatus}
          options={Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
        />
        <Input label="Artisan (nom)" value={artisanName} onChange={setArtisanName} />
        <Input label="Téléphone artisan" value={artisanPhone} onChange={setArtisanPhone} />
        <Input label="Coût (EUR)" type="number" value={cost} onChange={setCost} />
        <Input label="Date d'intervention prévue" type="date" value={scheduledDate} onChange={setScheduledDate} />
        <Input label="Date d'intervention effectuée" type="date" value={performedDate} onChange={setPerformedDate} />
        <ErrorMsg>{error}</ErrorMsg>
        <Button onClick={save} disabled={saving}>
          {saving ? "…" : "Enregistrer"}
        </Button>
        {request.status === "resolu" && (
          <Button
            variant="secondary"
            className="ml-2"
            onClick={async () => {
              await ownerApi("update_request", { id, status: "en_cours", updated_at: new Date().toISOString() });
              await load();
            }}
          >
            Rouvrir la demande
          </Button>
        )}
      </Card>

      {intervention && (
        <Card>
          <h2 className="font-semibold mb-2">Intervention</h2>
          <p className="text-sm text-slate-600">
            {intervention.artisan_name || "—"}
            {intervention.cost ? ` · ${intervention.cost} EUR` : ""}
            {intervention.scheduled_date ? ` · prévu le ${formatDateShort(intervention.scheduled_date)}` : ""}
            {intervention.performed_date ? ` · fait le ${formatDateShort(intervention.performed_date)}` : ""}
          </p>
        </Card>
      )}
    </div>
  );
}
