import { createRoot, type Root } from 'react-dom/client'
import { CurveOptimizer, type DailyToolsConfig } from './CurveOptimizer'
import { normalizeBrewOptimization } from '@/lib/brewOptimization'
import { editDailyPhoto } from './photoDialog'
import './tools.css'
class BrewCurveElement extends HTMLElement {
  private root: Root | null = null
  private data: DailyToolsConfig | null = null
  set config(value: DailyToolsConfig) { this.data = value; this.renderTools() }
  get config() { return this.data! }
  connectedCallback() { this.renderTools() }
  disconnectedCallback() { queueMicrotask(() => { if (!this.isConnected) { this.root?.unmount(); this.root = null } }) }
  private renderTools() {
    if (!this.isConnected || !this.data) return
    this.root ||= createRoot(this)
    this.root.render(<CurveOptimizer key={`${this.data.entry.id}-${this.data.entry.method}`} config={this.data} />)
  }
}
if (!customElements.get('coffee-lab-curve')) customElements.define('coffee-lab-curve', BrewCurveElement)
Object.assign(globalThis, { CoffeeLabDailyTools: { editPhoto: editDailyPhoto, normalizeAnalysis: normalizeBrewOptimization } })
