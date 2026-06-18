export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-500" />
        <p className="text-slate-400">Chargement...</p>
      </div>
    </div>
  )
}
