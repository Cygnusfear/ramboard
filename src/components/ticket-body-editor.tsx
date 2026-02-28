import { useCallback, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import {
  TextB, TextItalic, TextStrikethrough,
  Code, LinkSimple,
} from '@phosphor-icons/react'
import { markdownToHtml, htmlToMarkdown } from '@/lib/markdown'
import { SlashCommandExtension } from './slash-command'
import { ticketLinkPlugin } from './ticket-link-plugin'
import { useNavigate } from '@/hooks/use-navigate'
import { useProjectStore } from '@/stores/project-store'
import { useKnownTicketIds } from '@/hooks/use-known-ticket-ids'

// ── Styles ────────────────────────────────────────────────────

const toolbarBtnCls =
  'flex size-7 items-center justify-center rounded text-zinc-400 transition-colors ' +
  'hover:bg-zinc-700 hover:text-zinc-200 data-[active=true]:bg-zinc-700 data-[active=true]:text-blue-400'

// ── Component ─────────────────────────────────────────────────

interface TicketBodyEditorProps {
  body: string
  onSave: (markdown: string) => void
}

export function TicketBodyEditor({ body, onSave }: TicketBodyEditorProps) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef(body)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [, navigate] = useNavigate()
  const { activeProjectId } = useProjectStore()
  const knownIds = useKnownTicketIds()

  const save = useCallback((html: string) => {
    const md = htmlToMarkdown(html)
    if (md !== lastSavedRef.current) {
      lastSavedRef.current = md
      onSave(md)
    }
  }, [onSave])

  const debouncedSave = useCallback((html: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => save(html), 1500)
  }, [save])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'ticket-editor-link',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder: 'Add a description…',
      }),
      Typography,
      SlashCommandExtension,
    ],
    content: markdownToHtml(body, knownIds),
    editorProps: {
      attributes: {
        class: 'ticket-editor-body',
      },
    },
    onUpdate: ({ editor }) => {
      debouncedSave(editor.getHTML())
    },
    onBlur: ({ editor }) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      save(editor.getHTML())
    },
  })

  // Register ticket ID decoration plugin
  useEffect(() => {
    if (editor && knownIds.size > 0) {
      const plugin = ticketLinkPlugin(knownIds)
      const pluginKey = (plugin.spec as any).key
      const existing = editor.view.state.plugins.find(
        p => (p.spec as any).key === pluginKey
      )
      if (!existing) {
        editor.registerPlugin(plugin)
      }
    }
  }, [editor, knownIds])

  // Direct DOM click handler for links and ticket IDs.
  // ProseMirror's event pipeline swallows clicks, so we listen on
  // the wrapper div in the capture phase to get there first.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // 1. Ticket ID decoration — always clickable (plain click)
      if (target.classList.contains('ticket-id-link')) {
        const ticketId = target.getAttribute('data-ticket-id')
        if (ticketId && activeProjectId) {
          e.preventDefault()
          e.stopPropagation()
          navigate(`/${activeProjectId}/ticket/${ticketId}`)
          return
        }
      }

      // 2. Regular <a> links — Cmd+click (or Ctrl+click) to open
      const link = target.closest('a')
      if (link && (e.metaKey || e.ctrlKey)) {
        const href = link.getAttribute('href')
        if (!href) return

        e.preventDefault()
        e.stopPropagation()

        // Check if it's a ticket ID link
        const ticketMatch = href.match(/\/ticket\/([a-z0-9]+-[a-z0-9]+)$/)
        if (ticketMatch && activeProjectId) {
          navigate(`/${activeProjectId}/ticket/${ticketMatch[1]}`)
        } else {
          window.open(href, '_blank', 'noopener')
        }
      }
    }

    // Capture phase so we get the event before ProseMirror
    el.addEventListener('click', handleClick, true)
    return () => el.removeEventListener('click', handleClick, true)
  }, [navigate, activeProjectId])

  // Cmd+S to force save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (editor) {
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
          save(editor.getHTML())
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editor, save])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  if (!editor) return null

  return (
    <div ref={wrapperRef}>
      <BubbleMenu
        editor={editor}
        className="flex items-center gap-0.5 rounded-lg border border-zinc-700 bg-zinc-800 p-1 shadow-xl shadow-zinc-950/80"
      >
        <button
          type="button"
          className={toolbarBtnCls}
          data-active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <TextB size={16} />
        </button>
        <button
          type="button"
          className={toolbarBtnCls}
          data-active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <TextItalic size={16} />
        </button>
        <button
          type="button"
          className={toolbarBtnCls}
          data-active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <TextStrikethrough size={16} />
        </button>
        <button
          type="button"
          className={toolbarBtnCls}
          data-active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code size={16} />
        </button>
        <div className="mx-1 h-4 w-px bg-zinc-700" />
        <button
          type="button"
          className={toolbarBtnCls}
          data-active={editor.isActive('link')}
          onClick={() => {
            const url = window.prompt('URL:')
            if (url) editor.chain().focus().setLink({ href: url }).run()
          }}
        >
          <LinkSimple size={16} />
        </button>
      </BubbleMenu>

      <EditorContent editor={editor} />
    </div>
  )
}
