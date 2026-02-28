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
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef(body)

  const save = useCallback((html: string) => {
    const md = htmlToMarkdown(html)
    if (md !== lastSavedRef.current) {
      lastSavedRef.current = md
      onSave(md)
    }
  }, [onSave])

  // Debounced auto-save on content change
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
        openOnClick: true,
        HTMLAttributes: { class: 'text-blue-400 underline' },
      }),
      Placeholder.configure({
        placeholder: 'Add a description…',
      }),
      Typography,
      SlashCommandExtension,
    ],
    content: markdownToHtml(body),
    editorProps: {
      attributes: {
        class: `${proseClasses} outline-none min-h-[2rem] focus:outline-none cursor-text`,
      },
    },
    onUpdate: ({ editor }) => {
      debouncedSave(editor.getHTML())
    },
    onBlur: ({ editor }) => {
      // Flush immediately on blur
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      save(editor.getHTML())
    },
  })

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

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  if (!editor) return null

  return (
    <>
      {/* Floating toolbar — only shows on text selection */}
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

      {/* Editor content — always visible, always editable, no wrapper chrome */}
      <EditorContent editor={editor} />
    </>
  )
}
