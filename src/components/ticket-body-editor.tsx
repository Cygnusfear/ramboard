import { useState, useCallback, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  TextB, TextItalic, TextStrikethrough,
  Code, LinkSimple,
} from '@phosphor-icons/react'
import { markdownToHtml, htmlToMarkdown } from '@/lib/markdown'
import { useLinkifiedMarkdown } from '@/hooks/use-linkified-markdown'
import { SlashCommandExtension } from './slash-command'

// ── Styles ────────────────────────────────────────────────────

const toolbarBtnCls =
  'flex size-7 items-center justify-center rounded text-zinc-400 transition-colors ' +
  'hover:bg-zinc-700 hover:text-zinc-200 data-[active=true]:bg-zinc-700 data-[active=true]:text-blue-400'

const proseClasses =
  'prose prose-invert prose-sm max-w-none ' +
  'prose-headings:font-medium prose-headings:tracking-tight ' +
  'prose-h1:text-lg prose-h2:text-base prose-h3:text-sm ' +
  'prose-p:text-zinc-300 prose-p:leading-relaxed ' +
  'prose-a:text-blue-400 ' +
  'prose-code:rounded prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 ' +
  'prose-code:font-mono prose-code:text-xs prose-code:before:content-none prose-code:after:content-none ' +
  'prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 ' +
  'prose-li:text-zinc-300 prose-strong:text-zinc-200'

// ── Component ─────────────────────────────────────────────────

interface TicketBodyEditorProps {
  body: string
  onSave: (markdown: string) => void
}

export function TicketBodyEditor({ body, onSave }: TicketBodyEditorProps) {
  const [editing, setEditing] = useState(false)
  const markdownComponents = useLinkifiedMarkdown()

  const handleSave = useCallback((html: string) => {
    const md = htmlToMarkdown(html)
    onSave(md)
  }, [onSave])

  if (!editing) {
    return (
      <div
        className="group/body cursor-text"
        onClick={() => setEditing(true)}
      >
        {body?.trim() ? (
          <article className={proseClasses}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {body}
            </ReactMarkdown>
          </article>
        ) : (
          <p className="text-sm text-zinc-500 italic">Click to add description…</p>
        )}
        <div className="mt-2 hidden text-xs text-zinc-600 group-hover/body:block">
          Click to edit
        </div>
      </div>
    )
  }

  return (
    <TipTapEditor
      initialMarkdown={body}
      onSave={handleSave}
      onClose={() => setEditing(false)}
    />
  )
}

// ── TipTap editor (only mounts when editing) ──────────────────

function TipTapEditor({
  initialMarkdown,
  onSave,
  onClose,
}: {
  initialMarkdown: string
  onSave: (html: string) => void
  onClose: () => void
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const closingRef = useRef(false)

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
        HTMLAttributes: { class: 'text-blue-400 underline' },
      }),
      Placeholder.configure({
        placeholder: 'Write a description…',
      }),
      Typography,
      SlashCommandExtension,
    ],
    content: markdownToHtml(initialMarkdown),
    editorProps: {
      attributes: {
        class: `${proseClasses} outline-none min-h-[100px] focus:outline-none`,
      },
    },
  })

  // Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (editor) {
          onSave(editor.getHTML())
          onClose()
        }
      }
      if (e.key === 'Escape') {
        if (editor) {
          onSave(editor.getHTML())
          onClose()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editor, onSave, onClose])

  // Click outside to save & close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (closingRef.current) return
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        closingRef.current = true
        if (editor) {
          onSave(editor.getHTML())
          onClose()
        }
      }
    }
    // Delay to avoid catching the click that opened editor
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [editor, onSave, onClose])

  // Focus editor on mount
  useEffect(() => {
    if (editor) {
      requestAnimationFrame(() => editor.commands.focus('end'))
    }
  }, [editor])

  if (!editor) return null

  return (
    <div ref={wrapperRef} className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-4">
      {/* Floating toolbar */}
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

      <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3">
        <span className="text-xs text-zinc-600">
          ⌘S to save · Esc to save & close · / for commands
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md px-3 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-blue-600 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-500"
            onClick={() => {
              onSave(editor.getHTML())
              onClose()
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
