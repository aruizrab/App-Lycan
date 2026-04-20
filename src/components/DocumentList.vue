<template>
  <div class="dl-wrap glass">
    <div class="dl-header">
      <span class="dl-col dl-col--name">Name</span>
      <span class="dl-col dl-col--sub">Details</span>
      <span class="dl-col dl-col--date">Last modified</span>
      <span class="dl-col dl-col--actions"></span>
    </div>

    <div v-if="items.length === 0" class="dl-empty">
      {{ emptyMessage }}
    </div>

    <div
      v-for="item in items"
      :key="item.name"
      class="dl-row"
      @click="$emit('click:item', item.name)"
    >
      <span class="dl-col dl-col--name">
        <span class="dl-icon">
          <component :is="item.icon || FileTextIcon" :size="16" />
        </span>
        <span class="dl-name-text">
          {{ item.name }}
        </span>
      </span>
      <span class="dl-col dl-col--sub">
        <span v-if="item.subtitle" class="dl-subtitle">{{ item.subtitle }}</span>
      </span>
      <span class="dl-col dl-col--date">
        {{ formatDate(item.lastModified) }}
      </span>
      <span class="dl-col dl-col--actions" @click.stop>
        <slot name="action-menu" :item="item"></slot>
      </span>
    </div>
  </div>
</template>

<script setup>
import { FileText as FileTextIcon } from 'lucide-vue-next'

defineProps({
  items: {
    type: Array,
    required: true
  },
  emptyMessage: {
    type: String,
    default: 'No items found'
  }
})

defineEmits(['click:item'])

const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<style scoped>
.dl-wrap {
  border-radius: var(--radius-card);
  overflow: hidden;
}

.dl-header {
  display: grid;
  grid-template-columns: 1fr 180px 160px 52px;
  gap: 12px;
  padding: 10px 20px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--fg-3);
  border-bottom: 1px solid color-mix(in oklch, var(--fg-0) 8%, transparent);
}

.dl-empty {
  padding: 48px 20px;
  text-align: center;
  color: var(--fg-2);
  font-size: 14px;
}

.dl-row {
  display: grid;
  grid-template-columns: 1fr 180px 160px 52px;
  gap: 12px;
  padding: 13px 20px;
  align-items: center;
  cursor: pointer;
  transition: background var(--dur-fast);
  border-bottom: 1px solid color-mix(in oklch, var(--fg-0) 5%, transparent);
}
.dl-row:hover {
  background: color-mix(in oklch, var(--fg-0) 5%, transparent);
}
.dl-row:last-child {
  border-bottom: none;
}

.dl-col {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.dl-col--name {
  font-size: 14px;
  font-weight: 500;
  color: var(--fg-0);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dl-col--sub {
  font-size: 12px;
  color: var(--fg-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dl-col--date {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--fg-2);
}
.dl-col--actions {
  justify-content: flex-end;
}

.dl-icon {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: color-mix(in oklch, var(--accent) 12%, transparent);
  color: var(--accent);
  flex-shrink: 0;
}

.dl-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dl-subtitle {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
