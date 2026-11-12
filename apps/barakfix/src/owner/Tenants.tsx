import { useEffect, useState } from "react";
import { ownerApi, getOwnerToken } from "../lib/api";
import { Property, Tenant } from "../types";
import { Button, Card, ErrorMsg, Input, Select } from "../components/ui";

export default function Tenants() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const data = await ownerApi("list_tenants");
    setProperties(data.properties || []);
    if (!propertyId && data.properties && data.properties.length > 0) setPropertyId(data.properties[0].id);
    setTenants(data.tenants || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    setError("");
    setLoading(true);
    try {
      if (!propertyId) throw new Error("Sélectionnez un logement");
      if (!/^\d{4}$/.test(pin)) throw new Error("Le PIN doit contenir 4 chiffres");

      const owner_token = getOwnerToken();
      if (!owner_token) throw new Error("Session expirée, reconnectez-vous");

      const res = await fetch("/api/tenant-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner_token, property_id: propertyId, full_name: fullName, phone, email, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Création impossible");

      const prop = properties.find((p) => p.id === propertyId);
      const emailInfo = data.email_sent
        ? `Un email avec ses identifiants a été envoyé à ${email}.`
        : `⚠️ L'email n'a pas pu être envoyé :\n${data.email_error || "RESEND_API_KEY manquante dans Cloudflare"}\n\nCommuniquez-lui les identifiants manuellement.`;
      alert(
        `Locataire créé.\n\nCode logement : ${prop?.access_code}\nPIN choisi par vous : ${pin}\n\n${emailInfo}\n\nIl se connecte via « Je suis locataire » avec code + email + PIN.`
      );
      setFullName("");
      setPhone("");
      setEmail("");
      setPin("");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function revoke(t: Tenant) {
    if (!confirm(`Révoquer l'accès de ${t.full_name} ? Il ne pourra plus se connecter.`)) return;
    try {
      await ownerApi("delete_tenant", { id: t.id });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Locataires</h1>

      <Card className="mb-6">
        <h2 className="font-semibold mb-3">Nouveau locataire</h2>
        <Select
          label="Logement"
          value={propertyId}
          onChange={setPropertyId}
          options={
            properties.length
              ? properties.map((p) => ({ value: p.id, label: `${p.address} (${p.access_code})` }))
              : [{ value: "", label: "Créez d'abord un logement" }]
          }
        />
        <Input label="Nom complet" value={fullName} onChange={setFullName} required />
        <Input label="Téléphone" value={phone} onChange={setPhone} />
        <Input label="Email" type="email" value={email} onChange={setEmail} required />
        <Input
          label="PIN (4 chiffres)"
          type="password"
          value={pin}
          onChange={(v) => setPin(v.replace(/\D/g, "").slice(0, 4))}
          required
        />
        <ErrorMsg>{error}</ErrorMsg>
        <Button onClick={create} disabled={loading || !propertyId || !fullName || !email || pin.length !== 4}>
          {loading ? "…" : "Créer le locataire"}
        </Button>
      </Card>

      <div className="grid gap-4">
        {tenants.map((t) => {
          const prop = properties.find((p) => p.id === t.property_id);
          return (
            <Card key={t.id}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{t.full_name}</div>
                  <div className="text-sm text-slate-500">{t.email}{t.phone ? ` — ${t.phone}` : ""}</div>
                  <div className="text-sm text-slate-400">
                    {prop?.address || "Logement supprimé"} · accès créé le {new Date(t.created_at).toLocaleDateString("fr-BE")}
                  </div>
                </div>
                <Button variant="danger" onClick={() => revoke(t)}>
                  Révoquer l'accès
                </Button>
              </div>
            </Card>
          );
        })}
        {tenants.length === 0 && <p className="text-slate-500">Aucun locataire pour l'instant.</p>}
      </div>
    </div>
  );
}
