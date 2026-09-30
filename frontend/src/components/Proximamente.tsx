interface Props {
  titulo: string
  fase: number
  descripcion: string
}

export function Proximamente({ titulo, fase, descripcion }: Props) {
  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">{titulo}</h1>
      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-slate-600">
        <p className="text-sm font-semibold text-marca-700">Fase {fase}</p>
        <p className="mt-1">{descripcion}</p>
      </div>
    </section>
  )
}
