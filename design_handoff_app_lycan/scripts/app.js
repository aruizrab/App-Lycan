/* eslint-disable */
// App controller — screen switching, tweaks, modal
import {
  workspaceDashboard,
  insideDashboard,
  documentEditor,
  createImportModal,
  settingsModal,
  profileModal
} from './screens.js'
import { icons } from './icons.js'

const root = document.getElementById('screen-root')
const tweaksPanel = document.getElementById('tweaks-panel')
const tweaksToggle = document.getElementById('tweaks-toggle')
const navDock = document.getElementById('nav-dock')
const body = document.body

const state = {
  screen: localStorage.getItem('lycan.screen') || 'workspaces',
  view: 'grid',
  tab: 'cv',
  showForm: true,
  ai: true,
  ats: false,
  modal: null,
  floatAi: false
}

const screens = {
  workspaces: () => workspaceDashboard(state),
  dashboard: () => insideDashboard(state),
  editor: () => documentEditor(state)
}

const render = () => {
  root.innerHTML = screens[state.screen]()
  renderDock()
  renderModal()
  renderFloatAi()
  localStorage.setItem('lycan.screen', state.screen)
}

// Nav dock
const renderDock = () => {
  const items = [
    { id: 'workspaces', label: 'Workspaces', icon: icons.briefcase({ size: 12 }) },
    { id: 'dashboard', label: 'Inside workspace', icon: icons.file({ size: 12 }) },
    { id: 'editor', label: 'Editor', icon: icons.edit({ size: 12 }) },
    { id: '__modal_new', label: 'New modal', icon: icons.plus({ size: 12 }) },
    { id: '__modal_settings', label: 'Settings', icon: icons.settings({ size: 12 }) },
    { id: '__modal_profile', label: 'Profile', icon: icons.user({ size: 12 }) },
    { id: '__float_ai', label: 'Float AI', icon: icons.sparkles({ size: 12 }) }
  ]
  navDock.className = 'nav-dock glass-chrome'
  navDock.innerHTML = items
    .map(
      (i) =>
        `<button data-dock="${i.id}" class="${state.screen === i.id || (i.id === '__modal_new' && state.modal === 'new') || (i.id === '__modal_settings' && state.modal === 'settings') || (i.id === '__modal_profile' && state.modal === 'profile') || (i.id === '__float_ai' && state.floatAi) ? 'active' : ''}">${i.icon} ${i.label}</button>`
    )
    .join('')
}

const renderModal = () => {
  const existing = document.getElementById('modal-host')
  if (existing) existing.remove()
  if (!state.modal) return
  const host = document.createElement('div')
  host.id = 'modal-host'
  if (state.modal === 'new') host.innerHTML = createImportModal()
  if (state.modal === 'settings') host.innerHTML = settingsModal()
  if (state.modal === 'profile') host.innerHTML = profileModal()
  document.body.appendChild(host)
}

const renderFloatAi = () => {
  const existing = document.getElementById('float-ai-host')
  if (existing) existing.remove()
  if (!state.floatAi) return
  const host = document.createElement('div')
  host.id = 'float-ai-host'
  host.innerHTML = `
    <div class="float-ai glass sheen">
      <div class="ai-panel" style="padding:16px;height:100%;box-sizing:border-box">
        <div class="ai-head">
          <h4><span class="avatar">${icons.sparkles({ size: 14 })}</span> Quick chat</h4>
          <button class="icon-btn" style="width:30px;height:30px" data-action="close-float">${icons.close({ size: 14 })}</button>
        </div>
        <div class="ai-chips">
          <button class="chip">draft a new workspace</button>
          <button class="chip">compare two CVs</button>
        </div>
        <div class="ai-messages">
          <div class="msg"><div class="meta">Lycan</div><div class="bubble">Hey Mira — I can open any workspace, draft something new, or summarize where you left off. What's up?</div></div>
          <div class="msg user"><div class="meta">You</div><div class="bubble">Where did I leave off on Acme?</div></div>
          <div class="msg"><div class="meta">Lycan</div><div class="bubble">You were tightening the Platform CV bullets. The first role is done, the Linework section is still long. Want me to finish it?</div></div>
        </div>
        <div class="ai-input">
          <textarea placeholder="Message Lycan…"></textarea>
          <button class="ai-send">${icons.send({ size: 14 })}</button>
        </div>
      </div>
    </div>
  `
  document.body.appendChild(host)
}

// ---------- Tweaks ----------
const renderTweaks = () => {
  tweaksPanel.className = 'tweaks-panel glass sheen hidden'
  tweaksPanel.innerHTML = `
    <div class="between"><h5>Tweaks</h5><button class="icon-btn" style="width:28px;height:28px" data-action="close-tweaks">${icons.close({ size: 12 })}</button></div>

    <div class="group">
      <h5>Palette</h5>
      <div class="swatches">
        <div class="swatch moonlit ${body.dataset.palette === 'moonlit' ? 'active' : ''}" data-palette="moonlit" title="Moonlit"></div>
        <div class="swatch aurora ${body.dataset.palette === 'aurora' ? 'active' : ''}" data-palette="aurora" title="Aurora"></div>
        <div class="swatch dusk ${body.dataset.palette === 'dusk' ? 'active' : ''}" data-palette="dusk" title="Dusk"></div>
      </div>
    </div>

    <div class="group">
      <h5>Theme</h5>
      <div class="seg">
        <button class="${body.dataset.theme === 'dark' ? 'active' : ''}" data-theme="dark">Dark</button>
        <button class="${body.dataset.theme === 'light' ? 'active' : ''}" data-theme="light">Light</button>
      </div>
    </div>

    <div class="group">
      <h5>Glass intensity</h5>
      <div class="seg">
        <button class="${body.dataset.glass === 'subtle' ? 'active' : ''}" data-glass="subtle">Subtle</button>
        <button class="${body.dataset.glass === 'balanced' ? 'active' : ''}" data-glass="balanced">Balanced</button>
        <button class="${body.dataset.glass === 'heavy' ? 'active' : ''}" data-glass="heavy">Heavy</button>
      </div>
    </div>

    <div class="group">
      <h5>Ambient orbs</h5>
      <div class="seg">
        <button class="${body.dataset.orbs === 'on' ? 'active' : ''}" data-orbs="on">On</button>
        <button class="${body.dataset.orbs === 'off' ? 'active' : ''}" data-orbs="off">Off</button>
      </div>
    </div>

    <div class="group">
      <h5>Corner radius</h5>
      <div class="seg">
        <button class="${body.dataset.radius === 'sm' ? 'active' : ''}" data-radius="sm">S</button>
        <button class="${body.dataset.radius === 'md' ? 'active' : ''}" data-radius="md">M</button>
        <button class="${body.dataset.radius === 'lg' ? 'active' : ''}" data-radius="lg">L</button>
        <button class="${body.dataset.radius === 'xl' ? 'active' : ''}" data-radius="xl">XL</button>
      </div>
    </div>
  `
}

// ---------- Edit-mode protocol ----------
function registerEditMode() {
  window.addEventListener('message', (e) => {
    if (e.data?.type === '__activate_edit_mode') {
      tweaksPanel.classList.remove('hidden')
    } else if (e.data?.type === '__deactivate_edit_mode') {
      tweaksPanel.classList.add('hidden')
    }
  })
  window.parent?.postMessage({ type: '__edit_mode_available' }, '*')
}

// ---------- Event delegation ----------
document.addEventListener('click', (e) => {
  const t = e.target.closest(
    '[data-nav], [data-action], [data-tab], [data-view], [data-dock], [data-palette], [data-theme], [data-glass], [data-orbs], [data-radius]'
  )
  if (!t) return

  if (t.dataset.nav) {
    state.screen = t.dataset.nav
    if (state.screen === 'editor') {
      state.showForm = true
      state.ai = true
    }
    render()
    return
  }
  if (t.dataset.dock) {
    const d = t.dataset.dock
    if (d.startsWith('__modal_')) {
      state.modal = d.replace('__modal_', '')
      renderModal()
      renderDock()
    } else if (d === '__float_ai') {
      state.floatAi = !state.floatAi
      renderFloatAi()
      renderDock()
    } else {
      state.screen = d
      render()
    }
    return
  }
  if (t.dataset.tab) {
    state.tab = t.dataset.tab
    render()
    return
  }
  if (t.dataset.view) {
    state.view = t.dataset.view
    render()
    return
  }

  const a = t.dataset.action
  if (a === 'new') {
    state.modal = 'new'
    renderModal()
    renderDock()
  }
  if (a === 'settings') {
    state.modal = 'settings'
    renderModal()
    renderDock()
  }
  if (a === 'profile') {
    state.modal = 'profile'
    renderModal()
    renderDock()
  }
  if (a === 'close-modal') {
    state.modal = null
    renderModal()
    renderDock()
  }
  if (a === 'toggle-ai') {
    if (state.screen === 'editor') {
      state.ai = !state.ai
      render()
    } else {
      state.floatAi = !state.floatAi
      renderFloatAi()
      renderDock()
    }
  }
  if (a === 'close-ai') {
    state.ai = false
    render()
  }
  if (a === 'close-float') {
    state.floatAi = false
    renderFloatAi()
    renderDock()
  }
  if (a === 'toggle-form') {
    state.showForm = !state.showForm
    render()
  }
  if (a === 'toggle-ats') {
    state.ats = !state.ats
    render()
  }
  if (a === 'toggle-theme') {
    body.dataset.theme = body.dataset.theme === 'dark' ? 'light' : 'dark'
    renderTweaks()
  }
  if (a === 'close-tweaks') {
    tweaksPanel.classList.add('hidden')
  }

  if (t.dataset.palette) {
    body.dataset.palette = t.dataset.palette
    renderTweaks()
    persistTweaks()
  }
  if (t.dataset.theme) {
    body.dataset.theme = t.dataset.theme
    renderTweaks()
    persistTweaks()
  }
  if (t.dataset.glass) {
    body.dataset.glass = t.dataset.glass
    renderTweaks()
    persistTweaks()
  }
  if (t.dataset.orbs) {
    body.dataset.orbs = t.dataset.orbs
    renderTweaks()
    persistTweaks()
  }
  if (t.dataset.radius) {
    body.dataset.radius = t.dataset.radius
    renderTweaks()
    persistTweaks()
  }
})

tweaksToggle.addEventListener('click', () => {
  tweaksPanel.classList.toggle('hidden')
})

function persistTweaks() {
  const keys = ['theme', 'palette', 'glass', 'orbs', 'radius']
  const edits = {}
  keys.forEach((k) => (edits[k] = body.dataset[k]))
  window.parent?.postMessage({ type: '__edit_mode_set_keys', edits }, '*')
  localStorage.setItem('lycan.tweaks', JSON.stringify(edits))
}

// Load saved tweaks
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/ {
  theme: 'dark',
  palette: 'moonlit',
  glass: 'balanced',
  orbs: 'on',
  radius: 'lg'
} /*EDITMODE-END*/
try {
  const saved = JSON.parse(localStorage.getItem('lycan.tweaks') || 'null') || TWEAK_DEFAULTS
  Object.entries(saved).forEach(([k, v]) => (body.dataset[k] = v))
} catch {}

// ---------- Rich text editor (profile About) ----------
// Use mousedown so focus stays in the editor, then execCommand.
document.addEventListener('mousedown', (e) => {
  const btn = e.target.closest('.rte-btn')
  if (!btn) return
  e.preventDefault()
  const cmd = btn.dataset.cmd
  const arg = btn.dataset.arg
  const editor = document.querySelector('[data-profile-editor]')
  if (!editor) return
  editor.focus()
  if (cmd === 'createLink') {
    const url = prompt('Link URL', 'https://')
    if (url) document.execCommand('createLink', false, url)
  } else if (cmd === 'formatBlock') {
    // Toggle: if already in that block type, revert to P
    const sel = window.getSelection()
    let node = sel && sel.anchorNode
    while (node && node !== editor && node.nodeType !== 1) node = node.parentNode
    while (node && node !== editor && !/^(H1|H2|H3|P|BLOCKQUOTE|PRE|LI)$/.test(node.tagName))
      node = node.parentNode
    const already = node && node.tagName === arg
    document.execCommand('formatBlock', false, already ? 'P' : arg)
  } else {
    document.execCommand(cmd, false, arg || null)
  }
  setTimeout(syncRteActive, 0)
})

function syncRteActive() {
  const editor = document.querySelector('[data-profile-editor]')
  if (!editor) return
  document.querySelectorAll('.rte-btn').forEach((b) => {
    const cmd = b.dataset.cmd
    if (!cmd || cmd === 'createLink' || cmd === 'undo' || cmd === 'redo') return
    let on = false
    try {
      if (cmd === 'formatBlock') {
        const sel = window.getSelection()
        let node = sel && sel.anchorNode
        while (node && node !== editor && node.nodeType !== 1) node = node.parentNode
        while (node && node !== editor && !/^(H1|H2|H3|P|BLOCKQUOTE|PRE)$/.test(node.tagName))
          node = node.parentNode
        on = node && node.tagName === b.dataset.arg
      } else {
        on = document.queryCommandState(cmd)
      }
    } catch {}
    b.classList.toggle('is-active', !!on)
  })
}
document.addEventListener('keyup', (e) => {
  if (e.target.closest && e.target.closest('[data-profile-editor]')) syncRteActive()
})
document.addEventListener('mouseup', (e) => {
  if (e.target.closest && e.target.closest('[data-profile-editor]')) syncRteActive()
})

registerEditMode()
renderTweaks()
render()
