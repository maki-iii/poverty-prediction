export default function Footer() {
  return (
    <footer className="mt-auto pt-6 pb-4 px-1">
      <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-[11px] text-slate-400">
          © {new Date().getFullYear()} PPS-PH — Poverty Prediction System. All rights reserved.
        </p>
        <p className="text-[11px] text-slate-400">
          Built for NCR poverty incidence Prediction & analysis
        </p>
      </div>
    </footer>
  );
}