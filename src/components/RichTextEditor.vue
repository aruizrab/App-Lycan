<script setup>
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { watch, onBeforeUnmount } from 'vue'
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

let isSettingContent = false

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
    Underline,
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-sm max-w-none focus:outline-none min-h-[80px] dark:text-white',
    },
  },
  onUpdate: () => {
    if (!isSettingContent) {
      emit('update:modelValue', editor.value.getHTML())
    }
  },
})

watch(() => props.modelValue, (value) => {
  if (!editor.value) return
  const isSame = editor.value.getHTML() === value
  if (isSame) {
    return
  }
  isSettingContent = true
  editor.value.commands.setContent(value, false)
  isSettingContent = false
})

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy()
  }
})
</script>

<template>
  <div class="border rounded-md overflow-hidden bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
    <div v-if="editor" class="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 p-1 flex gap-1 items-center">
      <button @click="editor.chain().focus().toggleBold().run()" :class="{ 'bg-gray-200 dark:bg-gray-600 text-blue-600 dark:text-blue-400': editor.isActive('bold') }" class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors dark:text-gray-300" title="Bold" type="button">
        <Bold :size="16" />
      </button>
      <button @click="editor.chain().focus().toggleItalic().run()" :class="{ 'bg-gray-200 dark:bg-gray-600 text-blue-600 dark:text-blue-400': editor.isActive('italic') }" class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors dark:text-gray-300" title="Italic" type="button">
        <Italic :size="16" />
      </button>
      <button @click="editor.chain().focus().toggleUnderline().run()" :class="{ 'bg-gray-200 dark:bg-gray-600 text-blue-600 dark:text-blue-400': editor.isActive('underline') }" class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors dark:text-gray-300" title="Underline" type="button">
        <UnderlineIcon :size="16" />
      </button>
      <div class="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
      <button @click="editor.chain().focus().toggleBulletList().run()" :class="{ 'bg-gray-200 dark:bg-gray-600 text-blue-600 dark:text-blue-400': editor.isActive('bulletList') }" class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors dark:text-gray-300" title="Bullet List" type="button">
        <List :size="16" />
      </button>
      <button @click="editor.chain().focus().toggleOrderedList().run()" :class="{ 'bg-gray-200 dark:bg-gray-600 text-blue-600 dark:text-blue-400': editor.isActive('orderedList') }" class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors dark:text-gray-300" title="Ordered List" type="button">
        <ListOrdered :size="16" />
      </button>
    </div>
    <editor-content :editor="editor" class="p-2 dark:text-white" />
  </div>
</template>

<style>
/* Basic editor styles for the input area */
.ProseMirror ul {
  list-style-type: disc;
  padding-left: 1.5em;
}
.ProseMirror ol {
  list-style-type: decimal;
  padding-left: 1.5em;
}
.ProseMirror p {
  margin-bottom: 0.5em;
}
.ProseMirror p:last-child {
  margin-bottom: 0;
}
</style>