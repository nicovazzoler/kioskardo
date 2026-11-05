export function claseInput(conError = false) {
  return `w-full min-w-0 rounded-lg border px-3 py-2.5 text-base ${
    conError ? 'border-red-400 bg-red-50' : 'border-slate-300'
  }`
}
