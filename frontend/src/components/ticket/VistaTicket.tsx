import type { Linea } from '../../lib/ticket'

// Imita el papel térmico: columnas fijas en letra monoespaciada y doble alto en los renglones grandes.
export function VistaTicket({ lineas, columnas }: { lineas: Linea[]; columnas: number }) {
  return (
    <div className="mx-auto w-fit bg-[#fffef7] px-4 py-5 font-mono text-[13px] leading-snug text-slate-900 shadow-md ring-1 ring-slate-200">
      {lineas.map((linea, indice) => (
        <p
          key={indice}
          style={{ width: `${columnas}ch` }}
          className={`whitespace-pre ${linea.centrado ? 'text-center' : ''} ${linea.negrita ? 'font-bold' : ''} ${
            linea.grande ? 'my-1.5 scale-y-[1.7]' : ''
          }`}
        >
          {linea.texto || ' '}
        </p>
      ))}
    </div>
  )
}
