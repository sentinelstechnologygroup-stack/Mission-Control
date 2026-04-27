// /src/lib/PageNotFound.jsx
import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Home } from "lucide-react";

export default function PageNotFound() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10">
          <AlertTriangle className="h-8 w-8 text-cyan-300" />
        </div>

        <p className="mb-3 text-xs uppercase tracking-[0.32em] text-slate-500">
          Mission Control
        </p>

        <h1 className="mb-4 text-4xl font-semibold tracking-tight text-white">
          Page not found
        </h1>

        <p className="mb-2 max-w-xl text-sm text-slate-400">
          The route you requested does not exist in the current Mission Control
          UI shell.
        </p>

        <p className="mb-8 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-slate-500">
          Requested path: <span className="text-slate-300">{location.pathname}</span>
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/15"
          >
            <Home className="h-4 w-4" />
            Return home
          </Link>

          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.06]"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}