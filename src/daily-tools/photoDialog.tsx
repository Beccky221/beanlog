import { createRoot } from 'react-dom/client'
import { PhotoEditor } from './PhotoEditor'
export function editDailyPhoto(source: Blob): Promise<Blob | null> {
  return new Promise(resolve => {
    const trigger = document.activeElement
    const app = document.getElementById('root'), previous = app?.inert
    if (app) app.inert = true
    const previousDialogs = [...document.querySelectorAll<HTMLElement>('.bl-tools-modal')].map(node => ({ node, inert: node.inert }))
    previousDialogs.forEach(({ node }) => { node.inert = true })
    const node = document.createElement('div'); document.body.appendChild(node)
    const root = createRoot(node)
    const finish = (photo: Blob | null) => {
      root.unmount(); node.remove()
      previousDialogs.forEach(({ node, inert }) => { if (node.isConnected) node.inert = inert })
      if (app) app.inert = !!previous
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true })
      resolve(photo)
    }
    root.render(<PhotoEditor source={source} onCancel={() => finish(null)} onApply={finish} />)
  })
}
