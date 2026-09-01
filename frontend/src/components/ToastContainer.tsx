import React from "react";
import { useAuth } from "../context/AuthContext";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export default function ToastContainer() {
  const { toasts, removeToast } = useAuth();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl backdrop-blur-xl border transition-all animate-slide-up ${
            toast.type === "success"
              ? "bg-slate-900/95 border-emerald-500/40 text-white"
              : toast.type === "error"
              ? "bg-slate-900/95 border-rose-500/40 text-white"
              : toast.type === "warning"
              ? "bg-slate-900/95 border-amber-500/40 text-white"
              : "bg-slate-900/95 border-blue-500/40 text-white"
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {toast.type === "success" && <CheckCircle2 size={20} className="text-emerald-400" />}
            {toast.type === "error" && <AlertCircle size={20} className="text-rose-400" />}
            {toast.type === "warning" && <AlertTriangle size={20} className="text-amber-400" />}
            {toast.type === "info" && <Info size={20} className="text-blue-400" />}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold tracking-tight text-white">{toast.title}</h4>
            {toast.message && (
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{toast.message}</p>
            )}
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-white transition p-1"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
