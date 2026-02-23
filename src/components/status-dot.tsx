const STATUS_COLORS: Record<string, string> = {
  open: 'bg-emerald-500',
  in_progress: 'bg-amber-500',
  closed: 'bg-zinc-500',
  cancelled: 'bg-red-500',
}

const STATUS_RING: Record<string, string> = {
  open: 'ring-emerald-500/30',
  in_progress: 'ring-amber-500/30',
  closed: 'ring-zinc-500/30',
  cancelled: 'ring-red-500/30',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  closed: 'Closed',
  cancelled: 'Cancelled',
}

export function StatusDot({
  status,
  showLabel = false,
  interactive = false,
}: {
  status: string
  showLabel?: boolean
  interactive?: boolean
}) {
  const dot = STATUS_COLORS[status] || 'bg-zinc-600'
  const ring = STATUS_RING[status] || 'ring-zinc-600/30'

  return (
    <span className={`inline-flex items-center gap-1.5 ${interactive ? 'group/status' : ''}`}>
      <span
        className={`inline-block size-2 rounded-full ${dot} ring-2 ring-transparent transition-all ${
          interactive ? `group-hover/status:ring-2 group-hover/status:${ring} group-hover/status:scale-125` : ''
        }`}
      />
      {showLabel && (
        <span className="text-[11px] text-zinc-500">{STATUS_LABELS[status] || status}</span>
      )}
    </span>
  )
}
