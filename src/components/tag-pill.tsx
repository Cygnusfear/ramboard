const TAG_COLORS = [
  { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  { bg: 'bg-rose-500/10', text: 'text-rose-400' },
  { bg: 'bg-violet-500/10', text: 'text-violet-400' },
  { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  { bg: 'bg-teal-500/10', text: 'text-teal-400' },
]

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function TagPill({ tag, onClick }: { tag: string; onClick?: () => void }) {
  const color = TAG_COLORS[hashCode(tag) % TAG_COLORS.length]

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${color.bg} ${color.text} transition-colors hover:brightness-125`}
    >
      {tag}
    </button>
  )
}

export function TagList({ tags, max = 3, onTagClick }: { tags: string[]; max?: number; onTagClick?: (tag: string) => void }) {
  const visible = tags.slice(0, max)
  const overflow = tags.length - max

  return (
    <span className="inline-flex flex-wrap gap-1">
      {visible.map(tag => (
        <TagPill key={tag} tag={tag} onClick={onTagClick ? () => onTagClick(tag) : undefined} />
      ))}
      {overflow > 0 && (
        <span className="text-xs text-zinc-500">+{overflow}</span>
      )}
    </span>
  )
}
