<template>
  <span class="brand-mark" :style="maskStyle" />
</template>

<script setup>
import { computed } from 'vue'

const base = import.meta.env.BASE_URL

const maskStyle = computed(() => {
  const url = `${base}logo.svg`
  return {
    '--logo-url': `url('${url}')`
  }
})
</script>

<style scoped>
.brand-mark {
  width: 38px;
  height: 38px;
  display: block;
  flex-shrink: 0;
  background: radial-gradient(
    circle at 30% 30%,
    color-mix(in oklch, var(--accent) 85%, white),
    var(--accent-2)
  );
  -webkit-mask-image: var(--logo-url);
  mask-image: var(--logo-url);
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  filter: drop-shadow(0 0 12px var(--accent-glow));
}
</style>
