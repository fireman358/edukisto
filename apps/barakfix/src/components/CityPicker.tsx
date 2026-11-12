import { useMemo, useRef, useState, useEffect } from "react";
import { BELGIAN_CITIES_BY_CODE as BELGIAN_CITIES } from "../lib/belgianCities";

export default function CityPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (code: string) => void;
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = BELGIAN_CITIES.find((c) => c.code === value);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BELGIAN_CITIES.slice(0, 50);
    return BELGIAN_CITIES.filter(
      (c) => c.code.startsWith(q) || c.name.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pick(code: string) {
    onChange(code);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }

  return (
    <div className="block mb-3" ref={boxRef}>
      {label && <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={open ? query : selected ? `${selected.code} ${selected.name}` : ""}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setHighlight((h) => Math.min(h + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter" && open && results[highlight]) {
              e.preventDefault();
              pick(results[highlight].code);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Tapez un code postal ou une localité…"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition"
        />
        {open && (
          <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {results.length === 0 && (
              <p className="px-3 py-2 text-sm text-slate-500">Aucune localité trouvée</p>
            )}
            {results.map((c, i) => (
              <button
                type="button"
                key={c.code + c.name}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(c.code)}
                className={`w-full text-left px-3 py-2 text-sm ${
                  i === highlight ? "bg-slate-100" : "bg-white"
                }`}
              >
                <span className="font-mono text-slate-500 mr-2">{c.code}</span>
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
