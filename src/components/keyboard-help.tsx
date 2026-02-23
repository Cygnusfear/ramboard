import { useUIStore } from '@/stores/ui-store'
import { keybindings } from '@/lib/keybindings'
import { X } from '@phosphor-icons/react'

export function KeyboardHelp() {
  const { showKeyboardHelp, setShowKeyboardHelp } = useUIStore()

  if (!showKeyboardHelp) return null

  const categories = {
    navigation: keybindings.filter(k => k.category === 'navigation'),
    action: keybindings.filter(k => k.category === 'action'),
    view: keybindings.filter(k => k.category === 'view'),
  }

  function formatKey(kb: typeof keybindings[0]) {
    const parts = []
    if (kb.ctrl) parts.push('Ctrl')
    if (kb.meta) parts.push('⌘')
    if (kb.shift) parts.push('Shift')
    parts.push(kb.key)
    return parts.join('+')
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setShowKeyboardHelp(false)} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-200">Keyboard Shortcuts</h2>
          <button onClick={() => setShowKeyboardHelp(false)} className="text-zinc-500 hover:text-zinc-300">
            <X size={16} />
          </button>
        </div>

        {Object.entries(categories).map(([cat, bindings]) => (
          <div key={cat} className="mb-4">
            <h3 className="mb-2 text-xs uppercase tracking-wider text-zinc-500">{cat}</h3>
            <div className="space-y-1">
              {bindings.map(kb => (
                <div key={kb.action} className="flex items-center justify-between py-0.5">
                  <span className="text-xs text-zinc-400">{kb.description}</span>
                  <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    {formatKey(kb)}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
