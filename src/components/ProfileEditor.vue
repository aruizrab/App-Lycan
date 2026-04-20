<template>
  <div class="profile-editor-box">
    <!-- Toolbar -->
    <div v-if="editor" class="profile-toolbar">
      <button
        v-for="btn in toolbarButtons"
        :key="btn.title"
        class="tb-btn"
        :class="{ active: btn.isActive?.() }"
        :title="btn.title"
        type="button"
        @mousedown.prevent="btn.action()"
      >
        <component :is="btn.icon" v-if="btn.icon" :size="14" />
        <span v-else class="tb-label">{{ btn.label }}</span>
      </button>

      <span class="tb-sep"></span>

      <button
        class="tb-btn"
        title="Undo"
        type="button"
        :disabled="!editor.can().undo()"
        @mousedown.prevent="editor.chain().focus().undo().run()"
      >
        <RotateCcwIcon :size="13" />
      </button>
      <button
        class="tb-btn"
        title="Redo"
        type="button"
        :disabled="!editor.can().redo()"
        @mousedown.prevent="editor.chain().focus().redo().run()"
      >
        <RotateCwIcon :size="13" />
      </button>
    </div>

    <!-- Editor content -->
    <EditorContent class="profile-editor-content" :editor="editor" />

    <!-- Footer bar -->
    <div class="profile-editor-footer between">
      <span v-if="caption" class="footer-caption">{{ caption }}</span>
      <span v-else></span>
      <span class="footer-meta"
        >{{ approxTokens }} tokens<span v-if="savedLabel"> · {{ savedLabel }}</span></span
      >
    </div>
  </div>
</template>

<script setup>
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Markdown } from 'tiptap-markdown'
import { watch, onBeforeUnmount, computed, ref, onMounted, onUnmounted } from 'vue'
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Strikethrough as StrikethroughIcon,
  Heading2 as Heading2Icon,
  Quote as QuoteIcon,
  Code2 as Code2Icon,
  List as ListIcon,
  ListOrdered as ListOrderedIcon,
  RotateCcw as RotateCcwIcon,
  RotateCw as RotateCwIcon
} from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: String, default: '' },
  lastModified: { type: Number, default: null },
  caption: { type: String, default: '✦ Lycan re-reads this before every draft and tune.' }
})
const emit = defineEmits(['update:modelValue'])

// ── Editor setup ──────────────────────────────────────────────────────────────
const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
    Underline,
    Markdown.configure({
      html: false,
      tightLists: true,
      transformPastedText: true
    })
  ],
  editorProps: {
    attributes: { class: 'profile-prosemirror' }
  },
  onUpdate: () => {
    if (!editor.value) return
    emit('update:modelValue', editor.value.storage.markdown.getMarkdown())
  }
})

watch(
  () => props.modelValue,
  (value) => {
    if (!editor.value) return
    const current = editor.value.storage.markdown.getMarkdown()
    if (current === value) return
    editor.value.commands.setContent(value, false)
  }
)

onBeforeUnmount(() => editor.value?.destroy())

// ── Toolbar definition ────────────────────────────────────────────────────────
const toolbarButtons = computed(() => {
  if (!editor.value) return []
  const e = editor.value
  return [
    {
      title: 'Bold (Ctrl+B)',
      icon: BoldIcon,
      action: () => e.chain().focus().toggleBold().run(),
      isActive: () => e.isActive('bold')
    },
    {
      title: 'Italic (Ctrl+I)',
      icon: ItalicIcon,
      action: () => e.chain().focus().toggleItalic().run(),
      isActive: () => e.isActive('italic')
    },
    {
      title: 'Underline (Ctrl+U)',
      icon: UnderlineIcon,
      action: () => e.chain().focus().toggleUnderline().run(),
      isActive: () => e.isActive('underline')
    },
    {
      title: 'Strikethrough',
      icon: StrikethroughIcon,
      action: () => e.chain().focus().toggleStrike().run(),
      isActive: () => e.isActive('strike')
    },
    { title: '_sep1_', label: '|', action: () => {}, icon: null },
    {
      title: 'Heading 2',
      icon: Heading2Icon,
      action: () => e.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => e.isActive('heading', { level: 2 })
    },
    {
      title: 'Blockquote',
      icon: QuoteIcon,
      action: () => e.chain().focus().toggleBlockquote().run(),
      isActive: () => e.isActive('blockquote')
    },
    {
      title: 'Inline code',
      icon: Code2Icon,
      action: () => e.chain().focus().toggleCode().run(),
      isActive: () => e.isActive('code')
    },
    { title: '_sep2_', label: '|', action: () => {}, icon: null },
    {
      title: 'Bullet list',
      icon: ListIcon,
      action: () => e.chain().focus().toggleBulletList().run(),
      isActive: () => e.isActive('bulletList')
    },
    {
      title: 'Numbered list',
      icon: ListOrderedIcon,
      action: () => e.chain().focus().toggleOrderedList().run(),
      isActive: () => e.isActive('orderedList')
    }
  ]
})

// ── Token count ───────────────────────────────────────────────────────────────
const approxTokens = computed(() => {
  const text = props.modelValue || ''
  return Math.ceil(text.length / 4).toLocaleString()
})

// ── Relative saved label (refreshes every 10s) ────────────────────────────────
const tick = ref(0)
let timer = null
onMounted(() => {
  timer = setInterval(() => tick.value++, 10000)
})
onUnmounted(() => clearInterval(timer))

const savedLabel = computed(() => {
  tick.value // reactive dependency
  if (!props.lastModified) return null
  const secs = Math.floor((Date.now() - props.lastModified) / 1000)
  if (secs < 10) return 'just saved'
  if (secs < 60) return `saved ${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `saved ${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return hrs < 24 ? `saved ${hrs}h ago` : `saved ${Math.floor(hrs / 24)}d ago`
})
</script>

<style scoped>
.profile-editor-box {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid color-mix(in oklch, var(--fg-0) 12%, transparent);
  overflow: hidden;
  background: color-mix(in oklch, var(--bg-1) 60%, transparent);
}

/* Toolbar */
.profile-toolbar {
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 6px 8px;
  border-bottom: 1px solid color-mix(in oklch, var(--fg-0) 8%, transparent);
  background: color-mix(in oklch, var(--fg-0) 3%, transparent);
  flex-wrap: wrap;
}
.tb-btn {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: var(--fg-1);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
  flex-shrink: 0;
}
.tb-btn:hover {
  background: color-mix(in oklch, var(--fg-0) 10%, transparent);
  color: var(--fg-0);
}
.tb-btn.active {
  background: color-mix(in oklch, var(--accent) 18%, transparent);
  color: var(--accent);
}
.tb-btn:disabled {
  opacity: 0.3;
  cursor: default;
}
.tb-label {
  font-size: 11px;
  color: color-mix(in oklch, var(--fg-0) 25%, transparent);
  user-select: none;
  width: 4px;
  display: block;
}
.tb-sep {
  flex: 1;
}

/* Editor content area */
.profile-editor-content {
  flex: 1;
  min-height: 0;
}
</style>

<style>
/* Unscoped — targets ProseMirror internals */
.profile-prosemirror {
  min-height: 300px;
  max-height: 44vh;
  overflow-y: auto;
  padding: 16px 18px;
  outline: none;
  font-size: 14px;
  line-height: 1.75;
  color: var(--fg-0);
  font-family: var(--font-sans);
}
.profile-prosemirror p {
  margin: 0 0 0.6em;
}
.profile-prosemirror p:last-child {
  margin-bottom: 0;
}
.profile-prosemirror strong {
  font-weight: 600;
  color: var(--fg-0);
}
.profile-prosemirror em {
  font-style: italic;
}
.profile-prosemirror h1,
.profile-prosemirror h2,
.profile-prosemirror h3 {
  font-family: var(--font-serif);
  font-weight: 600;
  margin: 1em 0 0.4em;
  color: var(--fg-0);
}
.profile-prosemirror h1 {
  font-size: 20px;
}
.profile-prosemirror h2 {
  font-size: 16px;
}
.profile-prosemirror h3 {
  font-size: 14px;
}
.profile-prosemirror ul,
.profile-prosemirror ol {
  padding-left: 20px;
  margin: 0.4em 0 0.6em;
}
.profile-prosemirror ul {
  list-style: disc;
}
.profile-prosemirror ol {
  list-style: decimal;
}
.profile-prosemirror li {
  margin-bottom: 0.2em;
}
.profile-prosemirror blockquote {
  border-left: 3px solid color-mix(in oklch, var(--accent) 50%, transparent);
  padding-left: 12px;
  margin: 0.6em 0;
  color: var(--fg-1);
  font-style: italic;
}
.profile-prosemirror code {
  font-family: var(--font-mono);
  font-size: 12px;
  background: color-mix(in oklch, var(--fg-0) 8%, transparent);
  border-radius: 4px;
  padding: 1px 5px;
}
.profile-prosemirror s {
  text-decoration: line-through;
  color: var(--fg-2);
}
.profile-prosemirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: color-mix(in oklch, var(--fg-0) 30%, transparent);
  pointer-events: none;
  height: 0;
  font-style: italic;
}
</style>

<!-- Footer bar scoped back in -->
<style scoped>
.profile-editor-footer {
  padding: 7px 14px;
  border-top: 1px solid color-mix(in oklch, var(--fg-0) 8%, transparent);
  background: color-mix(in oklch, var(--fg-0) 2%, transparent);
}
.footer-caption {
  font-size: 12px;
  color: var(--fg-2);
  font-style: italic;
}
.footer-meta {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--fg-2);
}
</style>
