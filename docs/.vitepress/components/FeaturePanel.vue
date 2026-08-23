<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useData } from 'vitepress'

const { lang } = useData()
const isZh = computed(() => lang.value === 'zh-CN')

const features = computed(() =>
  isZh.value
    ? [
        {
          title: '多格式需求摄入',
          desc: '支持 Markdown、Word、Excel、PDF、图片 OCR、URL、直接文本——任何格式的需求输入，统一转化为标准 BDD .feature 验收标准。',
          code: `speclore spec requirements.md    # Markdown\nspeclore spec design.docx        # Word\nspeclore spec mockup.png         # 图片 OCR\nspeclore spec "用户需要重置密码"   # 直接文本`,
        },
        {
          title: 'AI 编码约束生成',
          desc: '自动检测项目中的 Cursor / Claude Code / Qoder，生成对应格式的编码约束文件和测试骨架，AI 编码时自动遵守业务规则。',
          code: `speclore code\n# 输出:\n# .cursor/rules/speclore.mdc\n# .claude/rules/speclore.md\n# .qoder/rules/speclore.md\n# tests/**/ *.test.ts (测试骨架)`,
        },
        {
          title: '自动验收映射',
          desc: '运行测试后自动将结果映射回 .feature 场景。三种映射策略：映射文件（自动）、显式标记（手动）、Pattern 匹配（配置）。',
          code: `speclore verify\n# ✅ 5/5 scenarios passed (100%)\n#\n# specs/order/create.feature\n#   ✓ 创建有效订单\n#   ✓ 库存不足时拒绝\n#   ✓ 重复商品时提示`,
        },
        {
          title: 'MCP 原生集成',
          desc: '4 个 MCP 工具通过标准协议暴露，AI 客户端直接调用。每次调用返回工作流状态和下一步指引，乱序操作自动报错。',
          code: `# AI 客户端通过 MCP 自动调用:\nspeclore.status  → 查看状态\nspeclore.spec    → 生成 feature\nspeclore.code    → 生成约束\nspeclore.verify  → 验收测试`,
        },
      ]
    : [
        {
          title: 'Multi-Format Requirement Ingestion',
          desc: 'Supports Markdown, Word, Excel, PDF, image OCR, URL, and plain text — any format of requirement input is unified into standard BDD .feature acceptance criteria.',
          code: `speclore spec requirements.md    # Markdown\nspeclore spec design.docx        # Word\nspeclore spec mockup.png         # Image OCR\nspeclore spec "reset password"   # Plain text`,
        },
        {
          title: 'AI Coding Constraint Generation',
          desc: 'Auto-detects Cursor / Claude Code / Qoder in your project, generates coding constraint files and test scaffolding in the correct format — AI coding automatically follows business rules.',
          code: `speclore code\n# Output:\n# .cursor/rules/speclore.mdc\n# .claude/rules/speclore.md\n# .qoder/rules/speclore.md\n# tests/**/*.test.ts (test scaffolding)`,
        },
        {
          title: 'Automated Acceptance Mapping',
          desc: 'After running tests, results are automatically mapped back to .feature scenarios. Three mapping strategies: mapping files (auto), explicit markers (manual), pattern matching (config).',
          code: `speclore verify\n# ✅ 5/5 scenarios passed (100%)\n#\n# specs/order/create.feature\n#   ✓ Create valid order\n#   ✓ Reject when inventory insufficient\n#   ✓ Warn on duplicate items`,
        },
        {
          title: 'MCP-Native Integration',
          desc: '4 MCP tools exposed via standard protocol, directly callable by AI clients. Each call returns workflow state and next-step guidance — out-of-order operations automatically error.',
          code: `# AI clients call via MCP automatically:\nspeclore.status  → Check status\nspeclore.spec    → Generate feature\nspeclore.code    → Generate constraints\nspeclore.verify  → Acceptance test`,
        },
      ]
)

const visibleCards = ref<Set<number>>(new Set())
const cardRefs = ref<HTMLElement[]>([])
let observer: IntersectionObserver | null = null

function setCardRef(el: any, index: number) {
  if (el) cardRefs.value[index] = el as HTMLElement
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const idx = cardRefs.value.indexOf(entry.target as HTMLElement)
        if (idx !== -1 && entry.isIntersecting) {
          visibleCards.value.add(idx)
        }
      })
    },
    { threshold: 0.15 }
  )
  cardRefs.value.forEach((el) => {
    if (el) observer!.observe(el)
  })
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<template>
  <div class="feature-panels">
    <div
      v-for="(feat, i) in features"
      :key="i"
      :ref="(el) => setCardRef(el, i)"
      :class="['feature-row', { 'reverse': i % 2 === 1, 'visible': visibleCards.has(i) }]"
    >
      <div class="feature-text">
        <h3>{{ feat.title }}</h3>
        <p>{{ feat.desc }}</p>
      </div>
      <div class="feature-code">
        <pre><code>{{ feat.code }}</code></pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feature-panels {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 3rem;
  padding: 2rem 0;
}
.feature-row {
  display: flex;
  align-items: center;
  gap: 2rem;
  opacity: 0;
  transform: translateY(24px);
  transition: all 0.6s ease;
}
.feature-row.visible {
  opacity: 1;
  transform: translateY(0);
}
.feature-row.reverse {
  flex-direction: row-reverse;
}
.feature-text {
  flex: 1;
}
.feature-text h3 {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
  color: var(--vp-c-brand-1);
}
.feature-text p {
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}
.feature-code {
  flex: 1;
  background: #1e1e2e;
  border-radius: 12px;
  padding: 1.25rem;
  overflow-x: auto;
}
.feature-code pre {
  margin: 0;
}
.feature-code code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.82rem;
  line-height: 1.6;
  color: #cdd6f4;
  white-space: pre;
}
@media (max-width: 768px) {
  .feature-row,
  .feature-row.reverse {
    flex-direction: column;
  }
}
</style>
