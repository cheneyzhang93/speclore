<script setup>
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isZh = computed(() => lang.value === 'zh-CN')

const actions = computed(() =>
  isZh.value
    ? [
        { label: '未初始化', type: 'initial' },
        { label: 'setup', type: 'action' },
        { label: 'spec', type: 'action' },
        { label: 'code', type: 'action' },
        { label: 'AI 编码', type: 'action' },
        { label: 'verify', type: 'action' },
      ]
    : [
        { label: 'Uninitialized', type: 'initial' },
        { label: 'setup', type: 'action' },
        { label: 'spec', type: 'action' },
        { label: 'code', type: 'action' },
        { label: 'AI Coding', type: 'action' },
        { label: 'verify', type: 'action' },
      ]
)

const states = computed(() =>
  isZh.value
    ? [
        { label: 'specified', desc: '已生成 .feature', col: 1 },
        { label: 'constrained', desc: '已生成约束+骨架', col: 2 },
        { label: 'verified', desc: '验收测试通过', col: 4 },
      ]
    : [
        { label: 'specified', desc: '.feature generated', col: 1 },
        { label: 'constrained', desc: 'Constraints + scaffolding', col: 2 },
        { label: 'verified', desc: 'All tests passed', col: 4 },
      ]
)

const triggers = computed(() =>
  isZh.value
    ? ['speclore spec', 'speclore code', 'speclore verify']
    : ['speclore spec', 'speclore code', 'speclore verify']
)
</script>

<template>
  <div class="state-machine">
    <!-- 顶行：动作流 -->
    <div class="action-row">
      <div
        v-for="(action, i) in actions"
        :key="i"
        class="action-node"
        :class="{ 'is-initial': action.type === 'initial' }"
      >
        <span class="action-label">{{ action.label }}</span>
      </div>
      <!-- 动作之间的箭头 -->
      <div
        v-for="i in actions.length - 1"
        :key="'arrow-' + i"
        class="action-arrow"
      >
        <svg width="24" height="16" viewBox="0 0 24 16">
          <line x1="0" y1="8" x2="18" y2="8" stroke="var(--vp-c-text-3)" stroke-width="2" />
          <polyline points="14,3 20,8 14,13" fill="none" stroke="var(--vp-c-text-3)" stroke-width="2" />
        </svg>
      </div>
    </div>

    <!-- 中间：垂直转换箭头 -->
    <div class="transition-row">
      <div class="transition-col" :style="{ gridColumn: '2' }">
        <svg width="24" height="40" viewBox="0 0 24 40">
          <line x1="12" y1="0" x2="12" y2="32" stroke="var(--vp-c-brand-1)" stroke-width="2" stroke-dasharray="4,3" />
          <polyline points="6,26 12,34 18,26" fill="none" stroke="var(--vp-c-brand-1)" stroke-width="2" />
        </svg>
      </div>
      <div class="transition-col" :style="{ gridColumn: '3' }">
        <svg width="24" height="40" viewBox="0 0 24 40">
          <line x1="12" y1="0" x2="12" y2="32" stroke="var(--vp-c-brand-1)" stroke-width="2" stroke-dasharray="4,3" />
          <polyline points="6,26 12,34 18,26" fill="none" stroke="var(--vp-c-brand-1)" stroke-width="2" />
        </svg>
      </div>
      <div class="transition-spacer" :style="{ gridColumn: '4' }"></div>
      <div class="transition-col" :style="{ gridColumn: '5' }">
        <svg width="24" height="40" viewBox="0 0 24 40">
          <line x1="12" y1="0" x2="12" y2="32" stroke="var(--vp-c-brand-1)" stroke-width="2" stroke-dasharray="4,3" />
          <polyline points="6,26 12,34 18,26" fill="none" stroke="var(--vp-c-brand-1)" stroke-width="2" />
        </svg>
      </div>
    </div>

    <!-- 底行：状态节点 -->
    <div class="state-row">
      <div class="state-spacer" :style="{ gridColumn: '1' }"></div>
      <div
        v-for="(state, i) in states"
        :key="i"
        class="state-node"
        :style="{ gridColumn: state.col + 1 }"
      >
        <span class="state-label">{{ state.label }}</span>
        <span class="state-desc">{{ state.desc }}</span>
        <span class="state-trigger">{{ triggers[i] }}</span>
      </div>
      <!-- 状态之间的箭头 -->
      <div class="state-arrow" :style="{ gridColumn: '3' }">
        <svg width="24" height="16" viewBox="0 0 24 16">
          <line x1="0" y1="8" x2="18" y2="8" stroke="var(--vp-c-brand-1)" stroke-width="2" />
          <polyline points="14,3 20,8 14,13" fill="none" stroke="var(--vp-c-brand-1)" stroke-width="2" />
        </svg>
      </div>
    </div>

    <!-- 反馈回路 -->
    <div class="feedback-row">
      <svg class="feedback-svg" viewBox="0 0 800 60" preserveAspectRatio="xMidYMid meet">
        <path
          d="M 680,30 L 740,30 Q 760,30 760,10 L 760,-20 Q 760,-40 740,-40 L 120,-40 Q 100,-40 100,-20 L 100,0"
          fill="none"
          stroke="var(--vp-c-brand-1)"
          stroke-width="2"
          stroke-dasharray="6,4"
          opacity="0.6"
        />
        <polyline points="94,-6 100,4 106,-6" fill="none" stroke="var(--vp-c-brand-1)" stroke-width="2" opacity="0.6" />
        <text
          :x="isZh ? 420 : 400"
          y="-22"
          text-anchor="middle"
          fill="var(--vp-c-text-3)"
          font-size="12"
        >
          {{ isZh ? '可重新 spec → 迭代' : 'Re-spec → Iterate' }}
        </text>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.state-machine {
  position: relative;
  padding: 2rem 1rem 1rem;
  overflow-x: auto;
}

/* ── 顶行：动作流 ─────────────────────────────── */
.action-row {
  display: grid;
  grid-template-columns: repeat(6, auto) repeat(5, 24px);
  grid-template-rows: 1fr;
  align-items: center;
  justify-items: center;
  gap: 0;
}

.action-row > :nth-child(odd) {
  grid-column: calc((var(--n, 1) * 2) - 1);
}

.action-node {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  transition: all 0.3s ease;
  white-space: nowrap;
}

.action-node:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 4px 16px rgba(45, 143, 111, 0.1);
  transform: translateY(-2px);
}

.action-node.is-initial {
  border-style: dashed;
  opacity: 0.7;
}

.action-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
}

.action-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── 中间：转换箭头 ───────────────────────────── */
.transition-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  height: 40px;
  align-items: start;
  justify-items: center;
}

.transition-col {
  display: flex;
  justify-content: center;
}

.transition-spacer {
  /* empty column */
}

/* ── 底行：状态节点 ───────────────────────────── */
.state-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  align-items: start;
  justify-items: center;
  gap: 0;
}

.state-spacer {
  /* empty first column */
}

.state-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: var(--vp-c-brand-soft);
  border: 1.5px solid var(--vp-c-brand-1);
  transition: all 0.3s ease;
  min-width: 120px;
}

.state-node:hover {
  box-shadow: 0 4px 20px rgba(45, 143, 111, 0.15);
  transform: translateY(-2px);
}

.state-label {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
}

.state-desc {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  margin-top: 0.25rem;
  text-align: center;
}

.state-trigger {
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  margin-top: 0.35rem;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
}

.state-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1rem;
}

/* ── 反馈回路 ─────────────────────────────────── */
.feedback-row {
  margin-top: 0.5rem;
  display: flex;
  justify-content: center;
}

.feedback-svg {
  width: 100%;
  max-width: 800px;
  height: 60px;
  overflow: visible;
}

/* ── 响应式 ──────────────────────────────────── */
@media (max-width: 768px) {
  .state-machine {
    padding: 1rem 0.5rem;
  }

  .action-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
  }

  .action-arrow {
    display: none;
  }

  .transition-row {
    display: none;
  }

  .state-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
  }

  .state-arrow {
    display: none;
  }

  .feedback-row {
    display: none;
  }

  .state-node {
    min-width: 100px;
  }
}
</style>
