<script setup>
import { ref, computed } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isZh = computed(() => lang.value === 'zh-CN')

const activeStep = ref(0)

const steps = computed(() =>
  isZh.value
    ? [
        {
          label: '1. 初始化',
          cmd: '$ speclore setup',
          output: `✔ 检测到 AI 工具: Cursor, Qoder
✔ 已写入 .cursor/mcp.json
✔ 已写入 .qoder-cn/mcp.json
✔ 已生成 .speclore/config.yaml`,
          status: 'success',
        },
        {
          label: '2. 生成规格',
          cmd: '$ speclore spec "患者注册需要手机号验证"',
          output: `✔ 已生成 specs/patient/register.feature
  场景 1: 手机号注册成功
  场景 2: 手机号格式错误时拒绝
  场景 3: 重复手机号时提示冲突
→ 下一步: speclore code`,
          status: 'success',
        },
        {
          label: '3. 生成约束',
          cmd: '$ speclore code',
          output: `✔ 已写入 .cursor/rules/speclore.mdc
✔ 已写入 .qoder/rules/speclore.md
✔ 已生成测试骨架 tests/patient/register.test.ts
→ 下一步: 在 AI 客户端中编码，然后 speclore verify`,
          status: 'success',
        },
        {
          label: '4. 验收',
          cmd: '$ speclore verify',
          output: `  运行测试: pnpm test
  ✔ 3/3 场景通过 (100%)

  specs/patient/register.feature
    ✓ 手机号注册成功         → passed
    ✓ 手机号格式错误时拒绝    → passed
    ✓ 重复手机号时提示冲突    → passed

✅ 验收通过`,
          status: 'success',
        },
      ]
    : [
        {
          label: '1. Setup',
          cmd: '$ speclore setup',
          output: `✔ Detected AI tools: Cursor, Qoder
✔ Written .cursor/mcp.json
✔ Written .qoder-cn/mcp.json
✔ Generated .speclore/config.yaml`,
          status: 'success',
        },
        {
          label: '2. Generate Spec',
          cmd: '$ speclore spec "Patient registration requires phone verification"',
          output: `✔ Generated specs/patient/register.feature
  Scenario 1: Register with valid phone
  Scenario 2: Reject invalid phone format
  Scenario 3: Warn on duplicate phone
→ Next: speclore code`,
          status: 'success',
        },
        {
          label: '3. Generate Constraints',
          cmd: '$ speclore code',
          output: `✔ Written .cursor/rules/speclore.mdc
✔ Written .qoder/rules/speclore.md
✔ Generated test scaffold tests/patient/register.test.ts
→ Next: Code in AI client, then speclore verify`,
          status: 'success',
        },
        {
          label: '4. Verify',
          cmd: '$ speclore verify',
          output: `  Running tests: pnpm test
  ✔ 3/3 scenarios passed (100%)

  specs/patient/register.feature
    ✓ Register with valid phone      → passed
    ✓ Reject invalid phone format    → passed
    ✓ Warn on duplicate phone        → passed

✅ Acceptance passed`,
          status: 'success',
        },
      ]
)

const title = computed(() => isZh.value ? '完整工作流演示' : 'Full Workflow Demo')
</script>

<template>
  <div class="workflow-demo">
    <h2>{{ title }}</h2>
    <div class="terminal">
      <div class="terminal-header">
        <div class="terminal-dots">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
        </div>
        <span class="terminal-title">speclore</span>
      </div>
      <div class="step-tabs">
        <button
          v-for="(step, i) in steps"
          :key="i"
          :class="['step-tab', { active: activeStep === i }]"
          @click="activeStep = i"
        >
          <span :class="['step-dot', step.status]"></span>
          {{ step.label }}
        </button>
      </div>
      <div class="terminal-body">
        <div class="cmd-line">{{ steps[activeStep].cmd }}</div>
        <pre class="output">{{ steps[activeStep].output }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workflow-demo {
  max-width: 720px;
  margin: 0 auto;
  text-align: center;
}
.workflow-demo h2 {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}
.terminal {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  text-align: left;
  background: #1e1e2e;
}
.terminal-header {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #181825;
  gap: 0.75rem;
}
.terminal-dots {
  display: flex;
  gap: 6px;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.dot.red { background: #f38ba8; }
.dot.yellow { background: #f9e2af; }
.dot.green { background: #a6e3a1; }
.terminal-title {
  font-size: 0.8rem;
  color: #6c7086;
  font-family: 'JetBrains Mono', monospace;
}
.step-tabs {
  display: flex;
  background: #181825;
  border-bottom: 1px solid #313244;
  overflow-x: auto;
}
.step-tab {
  flex: 1;
  padding: 0.6rem 0.75rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 0.78rem;
  color: #6c7086;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.2s;
  white-space: nowrap;
  font-family: 'JetBrains Mono', monospace;
}
.step-tab.active {
  color: #cdd6f4;
  background: #1e1e2e;
  box-shadow: inset 0 -2px 0 #2d8f6f;
}
.step-tab:hover:not(.active) {
  color: #a6adc8;
  background: #11111b;
}
.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.step-dot.success { background: #a6e3a1; }
.step-dot.pending { background: #f9e2af; }
.step-dot.error { background: #f38ba8; }
.terminal-body {
  padding: 1.25rem;
}
.cmd-line {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9rem;
  color: #a6e3a1;
  margin-bottom: 0.75rem;
}
.output {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.82rem;
  line-height: 1.6;
  color: #cdd6f4;
  margin: 0;
  white-space: pre;
  overflow-x: auto;
}
</style>
