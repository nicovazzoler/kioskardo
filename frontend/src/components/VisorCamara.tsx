import type { RefObject } from 'react'

interface Props {
  video: RefObject<HTMLVideoElement | null>
  error: string | null
}

export function VisorCamara({ video, error }: Props) {
  if (error) return <p className="rounded-xl bg-error/10 px-4 py-3 text-error">{error}</p>
  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video ref={video} className="aspect-[4/3] w-full object-cover" muted playsInline />
      <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-ambar/90" />
    </div>
  )
}
