import { useState } from "react";
import { CATEGORY_LABELS, Category, URGENCY_LABELS, Urgency } from "../types";
import { Button, Card, ErrorMsg, Input, Select } from "../components/ui";

export default function NewRequest({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("plomberie");
  const [urgency, setUrgency] = useState<Urgency>("normale");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<{ dataUrl: string; name: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function compress(file: File): Promise<string> {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = rej;
      el.src = URL.createObjectURL(file);
    });
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Veuillez choisir une image.");
      return;
    }
    try {
      const dataUrl = await compress(file);
      setPhoto({ dataUrl, name: file.name });
    } catch {
      setError("Impossible de lire cette image.");
    }
  }

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const token = localStorage.getItem("barakfix_tenant_token");
      if (!token) throw new Error("Session expirée, reconnectez-vous");

      const res = await fetch("/api/tenant-request-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          title,
          category,
          urgency,
          description,
          photo: photo?.dataUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Création impossible");

      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="text-slate-500 underline text-sm mb-3" onClick={onDone}>
        ← Retour
      </button>
      <h1 className="text-2xl font-bold mb-4">Nouvelle demande</h1>
      <Card>
        <Input label="Titre" value={title} onChange={setTitle} placeholder="Ex. Fuite sous l'évier" required />
        <Select
          label="Catégorie"
          value={category}
          onChange={(v) => setCategory(v as Category)}
          options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
        />
        <Select
          label="Urgence"
          value={urgency}
          onChange={(v) => setUrgency(v as Urgency)}
          options={Object.entries(URGENCY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
        />
        <label className="block mb-3">
          <span className="block text-sm font-medium text-slate-700 mb-1">Description</span>
          <textarea
            value={description}
            required
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
            placeholder="Décrivez le problème, quand il est apparu, ce que vous avez déjà essayé…"
          />
        </label>
        <label className="block mb-3">
          <span className="block text-sm font-medium text-slate-700 mb-1">
            Photo du problème (facultatif, une seule)
          </span>
          {photo ? (
            <div className="relative inline-block">
              <img src={photo.dataUrl} alt="Aperçu" className="max-h-48 rounded-lg border border-slate-200" />
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-sm leading-none"
                aria-label="Retirer la photo"
              >
                ×
              </button>
            </div>
          ) : (
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onFile}
              className="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-800 file:text-white file:text-sm file:cursor-pointer"
            />
          )}
        </label>
        <ErrorMsg>{error}</ErrorMsg>
        <Button onClick={submit} disabled={loading || !title || !description}>
          {loading ? "Envoi…" : "Envoyer la demande"}
        </Button>
      </Card>
    </div>
  );
}
