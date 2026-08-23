import DefaultTheme from 'vitepress/theme'

import InstallTabs from '../components/InstallTabs.vue'
import PipelineFlow from '../components/PipelineFlow.vue'
import FeaturePanel from '../components/FeaturePanel.vue'
import ClientGrid from '../components/ClientGrid.vue'
import WorkflowDemo from '../components/WorkflowDemo.vue'

import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('InstallTabs', InstallTabs)
    app.component('PipelineFlow', PipelineFlow)
    app.component('FeaturePanel', FeaturePanel)
    app.component('ClientGrid', ClientGrid)
    app.component('WorkflowDemo', WorkflowDemo)
  },
}
