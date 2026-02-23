const STATUS_COLORS: Record<string, string> = {
  open: 'bg-emerald-500',
  in_progress: 'bg-amber-500',
  closed: 'bg-zinc-500',
  cancelled: 'bg-red-500',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  closed: 'Closed',
  cancelled: 'Cancelled',
}

export function StatusDot({ status, showLabel = false }: { status: string; showLabel?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block size-2 rounded-full ${STATUS_COLORS[status] || 'bg-zinc-600'}`} />
      {showLabel && (
        <span className="text-xs text-zinc-400">{STATUS_LABELS[status] || status}</span>
      )}
    </span>
  )
}
