// Shared component helpers
import { icons, moonMark } from './icons.js'

export const el = (tag, attrs = {}, children = '') => {
  const a = Object.entries(attrs)
    .map(([k, v]) =>
      v === true ? k : v == null || v === false ? '' : `${k}="${String(v).replace(/"/g, '&quot;')}"`
    )
    .join(' ')
  const kids = Array.isArray(children) ? children.join('') : children
  return `<${tag}${a ? ' ' + a : ''}>${kids}</${tag}>`
}

export const brand = (subtitle = 'cv atelier') => `
  <a href="#" class="brand" data-nav="workspaces" onclick="event.preventDefault()">
    ${moonMark()}
    <span class="brand-name">App‑Lycan <em>${subtitle}</em></span>
  </a>
`

export const appbarTrail = (active = {}) => `
  <button class="icon-btn" data-action="profile" title="Profile">${icons.user()}</button>
  <button class="icon-btn ${active.ai ? 'active' : ''}" data-action="toggle-ai" title="AI assistant">${icons.sparkles()}</button>
  <button class="icon-btn" data-action="toggle-theme" title="Theme">${icons.moon()}</button>
  <div class="seg" data-seg="view">
    <button class="${active.view === 'list' ? '' : 'active'}" data-view="grid" title="Grid">${icons.grid()}</button>
    <button class="${active.view === 'list' ? 'active' : ''}" data-view="list" title="List">${icons.list()}</button>
  </div>
  <button class="btn btn-ghost" data-action="import">${icons.upload()} Import</button>
  <button class="btn btn-primary" data-action="new">${icons.plus()} ${active.newLabel || 'New'}</button>
`

export const cardMenu = () =>
  `<button class="card-menu" onclick="event.stopPropagation()" title="More">${icons.more({ size: 16 })}</button>`

export const pill = (text, kind = '') =>
  `<span class="pill ${kind}"><span class="dot"></span>${text}</span>`

export const tag = (text) => `<span class="tag">${text}</span>`

export const scoreBar = (n) => `<div class="score-bar"><span style="width:${n}%"></span></div>`

export const toggle = (checked = false) => `
  <label class="switch">
    <input type="checkbox" ${checked ? 'checked' : ''} onchange="event.stopPropagation()"/>
    <span class="track"></span><span class="thumb"></span>
  </label>
`
