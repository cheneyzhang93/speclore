<script setup>
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isZh = computed(() => lang.value === 'zh-CN')

const clients = [
  {
    name: 'Cursor',
    color: '#000000',
    svg: `<svg viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="256" height="256" rx="40" fill="currentColor"/><path d="M52 76.5L128 192L204 76.5" stroke="white" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  {
    name: 'Claude Code',
    color: '#CC785C',
    svg: `<svg viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="256" height="256" rx="40" fill="currentColor"/><path d="M70 170L128 86L186 170" stroke="white" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><line x1="90" y1="140" x2="166" y2="140" stroke="white" stroke-width="18" stroke-linecap="round"/></svg>`,
  },
  {
    name: 'Qoder',
    color: '#6C5CE7',
    svg: `<svg viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="256" height="256" rx="40" fill="currentColor"/><text x="128" y="155" text-anchor="middle" fill="white" font-size="120" font-weight="bold" font-family="sans-serif">Q</text></svg>`,
  },
]

const title = computed(() => isZh.value ? '支持主流 AI 编码客户端' : 'Works with Leading AI Coding Clients')
const subtitle = computed(() =>
  isZh.value
    ? 'speclore setup 自动检测并配置 MCP，无需手动设置'
    : 'speclore setup auto-detects and configures MCP — no manual setup needed'
)
</script>

<template>
  <div class="client-grid-section">
    <h2>{{ title }}</h2>
    <p class="subtitle">{{ subtitle }}</p>
    <div class="client-grid">
      <div v-for="client in clients" :key="client.name" class="client-card">
        <div class="client-logo" :style="{ color: client.color }" v-html="client.svg" />
        <span class="client-name">{{ client.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.client-grid-section {
  text-align: center;
  padding: 2rem 0;
}
.client-grid-section h2 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}
.subtitle {
  color: var(--vp-c-text-2);
  margin-bottom: 2rem;
  font-size: 0.95rem;
}
.client-grid {
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
}
.client-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem 2rem;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  transition: all 0.3s ease;
  min-width: 140px;
}
.client-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(45, 143, 111, 0.12);
  border-color: var(--vp-c-brand-1);
}
.client-logo {
  width: 56px;
  height: 56px;
  filter: grayscale(100%);
  opacity: 0.6;
  transition: all 0.3s ease;
}
.client-logo :deep(svg) {
  width: 100%;
  height: 100%;
}
.client-card:hover .client-logo {
  filter: grayscale(0%);
  opacity: 1;
}
.client-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--vp-c-text-1);
}
</style>
