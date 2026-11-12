
export default function GateScreen({ onChoice }: { onChoice: (role: "bailleur" | "locataire") => void }) {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
      <a href="https://edukisto.win/" target="_blank" rel="noopener" title="edukisto — relier & orienter" className="block mb-2 transition-transform hover:scale-110">
        <svg viewBox="0 0 64 64" fill="none" className="w-9 h-9 drop-shadow-sm" aria-hidden="true">
          <path d="M32 3l5.2 18.2 10.8-5.2-5.2 10.8L61 32l-18.2 5.2 5.2 10.8-10.8-5.2L32 61l-5.2-18.2-10.8 5.2 5.2-10.8L3 32l18.2-5.2-5.2-10.8 10.8 5.2z" fill="#0e7490" />
          <path d="M32 32c-1.6-2-3-3.1-4.8-3.1a4.7 4.7 0 1 0 0 9.4c1.8 0 3.2-1.1 4.8-3.1 1.6 2 3 3.1 4.8 3.1a4.7 4.7 0 1 0 0-9.4c-1.8 0-3.2 1.1-4.8 3.1z" stroke="#f8fafc" strokeWidth="2.2" />
        </svg>
      </a>
      <h1 className="text-4xl font-bold text-slate-800 mb-2">Barakfix</h1>
      <p className="text-slate-500 mb-8 text-center">
        Demandes de réparation entre bailleur et locataire — simple et tracé.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
        <button
          onClick={() => onChoice("bailleur")}
          className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition border border-slate-100"
        >
          <div className="text-3xl mb-2">🏠</div>
          <div className="font-semibold text-slate-800">Je suis bailleur</div>
          <div className="text-sm text-slate-500">Je gère mes logements et les réparations</div>
        </button>
        <button
          onClick={() => onChoice("locataire")}
          className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition border border-slate-100"
        >
          <div className="text-3xl mb-2">🔑</div>
          <div className="font-semibold text-slate-800">Je suis locataire</div>
          <div className="text-sm text-slate-500">Je signale une panne et je suis son statut</div>
        </button>
      </div>
    </div>
  );
}
