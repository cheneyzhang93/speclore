<script setup>
import { ref, computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isZh = computed(() => lang.value === 'zh-CN')

const tabs = [
  { key: 'npm', cmd: 'npm install -g speclore' },
  { key: 'pnpm', cmd: 'pnpm add -g speclore' },
  { key: 'yarn', cmd: 'yarn global add speclore' },
]

const active = ref(1) // pnpm default
const copied = ref(false)

function copyCmd() {
  navigator.clipboard.writeText(tabs[active.value].cmd)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <div class="install-tabs">
    <h2>{{ isZh ? '一键安装' : 'Install in Seconds' }}</h2>
    <div class="tabs-wrapper">
      <div class="tab-bar">
        <button
          v-for="(tab, i) in tabs"
          :key="tab.key"
          :class="['tab-btn', { active: active === i }]"
          @click="active = i"
        >
          {{ tab.key }}
        </button>
      </div>
      <div class="code-block">
        <code>$ {{ tabs[active].cmd }}</code>
        <button class="copy-btn" @click="copyCmd">
          {{ copied ? (isZh ? '已复制!' : 'Copied!') : (isZh ? '复制' : 'Copy') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.install-tabs {
  max-width: 560px;
  margin: 0 auto;
  text-align: center;
}
.install-tabs h2 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}
.tabs-wrapper {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}
.tab-bar {
  display: flex;
  border-bottom: 1px solid var(--vp-c-divider);
}
.tab-btn {
  flex: 1;
  padding: 0.6rem 1rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
  transition: all 0.2s;
}
.tab-btn.active {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg);
  box-shadow: inset 0 -2px 0 var(--vp-c-brand-1);
}
.tab-btn:hover:not(.active) {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-mute);
}
.code-block {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.95rem;
}
.code-block code {
  color: var(--vp-c-text-1);
}
.copy-btn {
  padding: 0.3rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.copy-btn:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}
</style>
