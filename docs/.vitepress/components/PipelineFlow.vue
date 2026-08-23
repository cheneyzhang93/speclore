<script setup>
import { computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isZh = computed(() => lang.value === 'zh-CN')

const steps = computed(() =>
  isZh.value
    ? [
        { icon: '📄', title: '需求来源', desc: 'Markdown / Word / URL / 直接文本' },
        { icon: '🧪', title: 'BDD .feature', desc: '标准 Gherkin 验收标准' },
        { icon: '🤖', title: '约束 + 骨架', desc: 'AI 编码约束 + 测试骨架' },
        { icon: '✅', title: '验收报告', desc: '自动测试映射 + 验收结果' },
      ]
    : [
        { icon: '📄', title: 'Requirements', desc: 'Markdown / Word / URL / Plain text' },
        { icon: '🧪', title: 'BDD .feature', desc: 'Standard Gherkin acceptance criteria' },
        { icon: '🤖', title: 'Constraints + Scaffolding', desc: 'AI coding constraints + test scaffolding' },
        { icon: '✅', title: 'Verification Report', desc: 'Auto test mapping + acceptance results' },
      ]
)
</script>

<template>
  <div class="pipeline-flow">
    <h2>{{ isZh ? '从需求到验收，一条流水线' : 'From Requirements to Verification, One Pipeline' }}</h2>
    <div class="flow-container">
      <div v-for="(step, i) in steps" :key="i" class="flow-step">
        <div class="step-card">
          <span class="step-icon">{{ step.icon }}</span>
          <h3>{{ step.title }}</h3>
          <p>{{ step.desc }}</p>
        </div>
        <div v-if="i < steps.length - 1" class="step-arrow">→</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pipeline-flow {
  text-align: center;
  padding: 2rem 0;
}
.pipeline-flow h2 {
  font-size: 1.5rem;
  margin-bottom: 2rem;
}
.flow-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  flex-wrap: wrap;
}
.flow-step {
  display: flex;
  align-items: center;
}
.step-card {
  padding: 1.25rem 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  min-width: 160px;
  transition: all 0.3s ease;
}
.step-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(45, 143, 111, 0.12);
  border-color: var(--vp-c-brand-1);
}
.step-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
}
.step-card h3 {
  font-size: 1rem;
  margin: 0.25rem 0;
  color: var(--vp-c-text-1);
}
.step-card p {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  margin: 0.25rem 0 0;
}
.step-arrow {
  font-size: 1.5rem;
  color: var(--vp-c-brand-1);
  padding: 0 0.75rem;
  font-weight: bold;
}
@media (max-width: 768px) {
  .flow-container {
    flex-direction: column;
    gap: 0.5rem;
  }
  .flow-step {
    flex-direction: column;
  }
  .step-arrow {
    transform: rotate(90deg);
    padding: 0.25rem 0;
  }
}
</style>
