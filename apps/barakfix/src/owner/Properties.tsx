import { useEffect, useState } from "react";
import { ownerApi } from "../lib/api";
import { Property } from "../types";
import { Button, Card, ErrorMsg, Input, Select } from "../components/ui";
import CityPicker from "../components/CityPicker";
import { BELGIAN_CITIES } from "../lib/belgianCities";
import { PROPERTY_TYPES } from "../lib/propertyTypes";

const GENERIC_WORDS = [
  "rue", "avenue", "boulevard", "chaussee", "chaussée", "place", "square", "weg", "straat",
  "laan", "plein", "drève", "dreef", "allée", "allee", "chemin", "court", "lane",
];

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function generateAccessCode(address: string): string | null {
  const t = stripAccents(address).trim().toLowerCase();
  if (!t) return null;

  let rest = t;
  let number = "";

  const startNum = rest.match(/^(\d+[a-z]?)\s+/);
  if (startNum) {
    number = startNum[1];
    rest = rest.slice(startNum[0].length);
  }

  const endNum = rest.match(/,?\s+(\d+[a-z]?)\s*$/);
  if (endNum && !number) {
    number = endNum[1];
    rest = rest.slice(0, rest.length - endNum[0].length);
  }

  const parts = rest.split(",").map((p) => p.trim()).filter(Boolean);
  let street = parts[0] || "";
  let city = parts[1] || "";

  const cpMatch = city.match(/^\d{4}\s+(.*)$/);
  if (cpMatch) city = cpMatch[1];
  const cpInStreet = street.match(/^\d{4}\s+(.*)$/);
  if (cpInStreet) street = cpInStreet[1];

  const streetWords = street.split(/\s+/).filter(
    (w) => w.length >= 2 && !GENERIC_WORDS.includes(w)
  );
  const cityWords = city.split(/\s+/).filter((w) => w.length >= 2);

  const s = (streetWords[0] || street.split(/\s+/)[0] || "").toUpperCase().slice(0, 3).padEnd(3, "X");
  const c = (cityWords[0] || "XXX").toUpperCase().slice(0, 3).padEnd(3, "X");
  const n = (number || "0").toUpperCase();

  if (s.replace(/X/g, "").length === 0) return null;
  return `${c}-${s}-${n}`;
}

export default function Properties() {
  const [list, setList] = useState<Property[]>([]);
  const [streetNumber, setStreetNumber] = useState("");
  const [streetName, setStreetName] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [type, setType] = useState(PROPERTY_TYPES[0].value);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);

  const address = streetNumber && streetName && cityCode
    ? `${streetNumber} ${streetName}, ${cityCode} ${BELGIAN_CITIES.find((c) => c.code === cityCode)?.name || ""}`
    : "";

  async function load() {
    const data = await ownerApi("list_properties");
    setList(data.properties || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    setError("");
    setLoading(true);
    try {
      const code = generateAccessCode(address);
      if (!code) throw new Error("Adresse incomplète : numéro, rue et localité sont requis");
      await ownerApi("create_property", { address, type, notes: notes || null, access_code: code });
      setNewCode(code);
      setStreetNumber("");
      setStreetName("");
      setCityCode("");
      setNotes("");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function regenerate(p: Property) {
    const suffix = Math.floor(Math.random() * 90 + 10);
    const code = generateAccessCode(p.address);
    if (!code) return;
    const unique = `${code}-${suffix}`;
    await ownerApi("update_property", { id: p.id, access_code: unique, access_code_revoked_at: null });
    alert(`Nouveau code logement : ${unique}\nCommuniquez-le à vos locataires — l'ancien est invalidé.`);
    await load();
  }

  async function remove(p: Property) {
    if (!confirm(`Supprimer le logement ${p.address} ?\nSes locataires et toutes leurs demandes seront également supprimés.`)) return;
    try {
      await ownerApi("delete_property", { id: p.id });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function revoke(p: Property) {
    if (!confirm(`Révoquer les accès au logement ${p.access_code} ? Les locataires ne pourront plus se connecter.`)) return;
    await ownerApi("update_property", { id: p.id, access_code: p.access_code, access_code_revoked_at: new Date().toISOString() });
    await load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Logements</h1>

      <Card className="mb-6">
        <h2 className="font-semibold mb-3">Nouveau logement</h2>
        <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-x-3">
          <Input label="Numéro" value={streetNumber} onChange={setStreetNumber} placeholder="12" />
          <Input label="Rue" value={streetName} onChange={setStreetName} placeholder="Rue Haute" />
        </div>
        <CityPicker
          label="Localité (tapez le code postal ou le nom — liste officielle bpost)"
          value={cityCode}
          onChange={setCityCode}
        />
        <Select
          label="Type de logement"
          value={type}
          onChange={setType}
          options={PROPERTY_TYPES}
        />
        <Input label="Notes (facultatif)" value={notes} onChange={setNotes} />
        {address && (
          <p className="text-sm text-slate-500 mb-3">Adresse : {address}</p>
        )}
        <ErrorMsg>{error}</ErrorMsg>
        <Button onClick={create} disabled={loading || !address}>
          {loading ? "…" : "Créer le logement"}
        </Button>
        {newCode && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              Logement créé. Code logement à communiquer au locataire :
            </p>
            <p className="text-xl font-mono font-bold text-green-900">{newCode}</p>
          </div>
        )}
      </Card>

      <div className="grid gap-4">
        {list.map((p) => (
          <Card key={p.id}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold">{p.address}</div>
                <div className="text-sm text-slate-500">{p.type}{p.notes ? ` — ${p.notes}` : ""}</div>
                <div className="mt-1 font-mono text-sm">
                  Code : {p.access_code}
                  {p.access_code_revoked_at && (
                    <span className="ml-2 text-red-600">(révoqué)</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="secondary" onClick={() => regenerate(p)}>
                  Régénérer le code
                </Button>
                {!p.access_code_revoked_at && (
                  <Button variant="danger" onClick={() => revoke(p)}>
                    Révoquer
                  </Button>
                )}
                <Button variant="danger" onClick={() => remove(p)}>
                  Supprimer le logement
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {list.length === 0 && <p className="text-slate-500">Aucun logement pour l'instant.</p>}
      </div>
    </div>
  );
}
