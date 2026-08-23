import { defineConfig } from 'vitepress'

const hostname = 'https://speclore.tech'
const base = ''

export default defineConfig({
  // ── 基础 ──────────────────────────────────────────
  title: 'SpecLore',
  description:
    'AI 编码时代的产研协同工具 — 把需求变成可验收的 BDD 规格，把验收变成自动化流水线',
  base: base + '/',
  srcDir: '.',
  outDir: '.vitepress/dist',
  cleanUrls: true,

  // ── SEO ───────────────────────────────────────────
  sitemap: {
    hostname: hostname + base + '/',
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: base + '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#2d8f6f' }],
    ['meta', { name: 'keywords', content: 'speclore, BDD, AI coding, acceptance testing, MCP, Gherkin, cursor, claude-code, qoder, behavior-driven development' }],
    // Open Graph
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'SpecLore - AI-Powered BDD Spec & Acceptance Testing CLI' }],
    ['meta', { property: 'og:description', content: 'Turn requirements into verifiable BDD specs, generate AI coding constraints, and automate acceptance testing.' }],
    ['meta', { property: 'og:image', content: hostname + base + '/og-image.png' }],
    ['meta', { property: 'og:url', content: hostname + base + '/' }],
    ['meta', { property: 'og:site_name', content: 'SpecLore' }],
    ['meta', { property: 'og:locale', content: 'zh_CN' }],
    ['meta', { property: 'og:locale:alternate', content: 'en_US' }],
    // Twitter Card
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'SpecLore - AI-Powered BDD Spec & Acceptance Testing CLI' }],
    ['meta', { name: 'twitter:description', content: 'Turn requirements into verifiable BDD specs, generate AI coding constraints, and automate acceptance testing.' }],
    ['meta', { name: 'twitter:image', content: hostname + base + '/og-image.png' }],
  ],

  // ── 暗色模式默认 ──────────────────────────────────
  appearance: 'dark',

  // ── 构建 ──────────────────────────────────────────
  lastUpdated: true,

  // ── i18n: 中文（默认）+ 英文 ─────────────────────
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/',
      themeConfig: {
        nav: [
          { text: '指南', link: '/guide/getting-started' },
          { text: '参考', link: '/reference/configuration' },
          { text: '进阶', link: '/advanced/plugin-guide' },
        ],
        sidebar: {
          '/guide/': [
            {
              text: '指南',
              items: [
                { text: '快速开始', link: '/guide/getting-started' },
                { text: '工作流', link: '/guide/workflow' },
                { text: '完整示例', link: '/guide/examples' },
              ],
            },
          ],
          '/reference/': [
            {
              text: '参考',
              items: [
                { text: '配置参考', link: '/reference/configuration' },
                { text: 'MCP 工具', link: '/reference/mcp-tools' },
                { text: '测试映射', link: '/reference/test-mapping' },
              ],
            },
          ],
          '/advanced/': [
            {
              text: '进阶',
              items: [
                { text: '插件开发', link: '/advanced/plugin-guide' },
                { text: '技术架构', link: '/advanced/architecture' },
              ],
            },
          ],
        },
        docFooter: {
          prev: '上一页',
          next: '下一页',
        },
        outline: {
          label: '页面导航',
        },
        lastUpdated: {
          text: '最后更新于',
        },
        editLink: {
          text: '在 GitHub 上编辑此页',
        },
        search: {
          provider: 'local',
          options: {
            translations: {
              button: { buttonText: '搜索文档' },
              modal: {
                searchBox: { placeholder: '搜索文档...' },
                noResultsText: '未找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
              },
            },
          },
        },
        footer: {
          message: '基于 MIT 许可发布',
          copyright: 'Copyright © 2024-present SpecLore Contributors',
        },
      },
    },
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/guide/getting-started' },
          { text: 'Reference', link: '/en/reference/configuration' },
          { text: 'Advanced', link: '/en/advanced/plugin-guide' },
        ],
        sidebar: {
          '/en/guide/': [
            {
              text: 'Guide',
              items: [
                { text: 'Getting Started', link: '/en/guide/getting-started' },
                { text: 'Workflow', link: '/en/guide/workflow' },
                { text: 'Examples', link: '/en/guide/examples' },
              ],
            },
          ],
          '/en/reference/': [
            {
              text: 'Reference',
              items: [
                { text: 'Configuration', link: '/en/reference/configuration' },
                { text: 'MCP Tools', link: '/en/reference/mcp-tools' },
                { text: 'Test Mapping', link: '/en/reference/test-mapping' },
              ],
            },
          ],
          '/en/advanced/': [
            {
              text: 'Advanced',
              items: [
                { text: 'Plugin Development', link: '/en/advanced/plugin-guide' },
                { text: 'Architecture', link: '/en/advanced/architecture' },
              ],
            },
          ],
        },
        docFooter: {
          prev: 'Previous',
          next: 'Next',
        },
        outline: {
          label: 'On this page',
        },
        lastUpdated: {
          text: 'Last updated',
        },
        editLink: {
          text: 'Edit this page on GitHub',
        },
        footer: {
          message: 'Released under the MIT License.',
          copyright: 'Copyright © 2024-present SpecLore Contributors',
        },
      },
    },
  },

  // ── 主题（共享） ──────────────────────────────────
  themeConfig: {
    logo: '/logo.svg',

    socialLinks: [
      { icon: 'github', link: 'https://github.com/cheneyzhang93/speclore' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/speclore' },
    ],

    editLink: {
      pattern: 'https://github.com/cheneyzhang93/speclore/edit/main/docs/:path',
    },

    search: {
      provider: 'local',
    },
  },
})
