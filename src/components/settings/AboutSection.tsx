export function AboutSection() {
  return (
    <section className="mt-5 pb-8">
      <h2 className="px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
        Acerca de
      </h2>

      <div className="mt-2 mx-4 border-t border-b border-line text-xs">
        <div className="min-h-12 py-2 border-b border-line flex items-center justify-between">
          <span className="text-neutral-300">Versión</span>
          <span className="text-white font-mono num">2.0.0</span>
        </div>
        <div className="min-h-12 py-2 border-b border-line flex items-center justify-between">
          <span className="text-neutral-300">Almacenamiento</span>
          <span className="text-white">Local-first (offline)</span>
        </div>
        <div className="min-h-12 py-2 border-b border-line flex items-center justify-between">
          <span className="text-neutral-300">Idioma</span>
          <span className="text-white">Español</span>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-neutral-400">
        HardFit 2.0 · sin anuncios, sin suscripción
      </p>
    </section>
  )
}
