export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6">
      <main className="max-w-xl w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Frontend Boilerplate Ready 🚀
        </h1>
        <p className="text-zinc-400 text-sm">
          Vite + React + Tailwind CSS v4 are fully configured and running with pnpm.
        </p>
        <div className="pt-4 border-t border-zinc-800 flex justify-center gap-4">
          <a
            href="https://vite.dev"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium rounded-lg transition-colors"
          >
            Vite Docs
          </a>
          <a
            href="https://tailwindcss.com"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-cyan-950/50 border border-cyan-800/50 hover:bg-cyan-900/50 text-cyan-200 text-xs font-medium rounded-lg transition-colors"
          >
            Tailwind v4 Docs
          </a>
        </div>
      </main>
    </div>
  )
}
