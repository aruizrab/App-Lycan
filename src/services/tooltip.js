/**
 * Global glass tooltip system.
 *
 * Intercepts all [title] attributes on hover, removes the attribute to suppress
 * the browser's native tooltip, and renders a custom glass-styled tooltip instead.
 * Call initTooltips() once from App.vue onMounted.
 */

let tooltip = null
let currentTarget = null
let showTimer = null

const DELAY = 350 // ms before tooltip appears

function getTooltipEl() {
  if (!tooltip) {
    tooltip = document.createElement('div')
    tooltip.className = 'glass-tooltip'
    tooltip.setAttribute('aria-hidden', 'true')
    document.body.appendChild(tooltip)
  }
  return tooltip
}

function position(e) {
  const el = getTooltipEl()
  el.style.visibility = 'hidden'
  el.style.display = 'block'

  const rect = el.getBoundingClientRect()
  const gap = 10

  let left = e.clientX - rect.width / 2
  let top = e.clientY - rect.height - gap

  // Keep inside viewport
  left = Math.max(8, Math.min(left, window.innerWidth - rect.width - 8))
  if (top < 8) top = e.clientY + gap + 16 // flip below cursor

  el.style.left = left + 'px'
  el.style.top = top + 'px'
  el.style.visibility = 'visible'
}

function show(text, e) {
  const el = getTooltipEl()
  el.textContent = text
  position(e)
}

function hide() {
  clearTimeout(showTimer)
  showTimer = null

  if (tooltip) {
    tooltip.style.display = 'none'
  }

  if (currentTarget) {
    const stored = currentTarget.__tooltipTitle
    if (stored !== undefined) {
      currentTarget.setAttribute('title', stored)
      delete currentTarget.__tooltipTitle
    }
    currentTarget = null
  }
}

export function initTooltips() {
  // Mouseover — event delegation, find nearest [title] ancestor
  document.addEventListener(
    'mouseover',
    (e) => {
      const el = e.target.closest('[title]')

      // Same element → nothing to do
      if (el && el === currentTarget) return

      // Leaving old element
      if (currentTarget) hide()
      if (!el) return

      const text = el.getAttribute('title')
      if (!text) return

      // Strip native tooltip by removing the attribute
      el.__tooltipTitle = text
      el.removeAttribute('title')
      currentTarget = el

      clearTimeout(showTimer)
      showTimer = setTimeout(() => show(text, e), DELAY)
    },
    true
  )

  // Follow cursor while hovering
  document.addEventListener('mousemove', (e) => {
    if (currentTarget && tooltip?.style.display === 'block') {
      position(e)
    } else if (currentTarget && showTimer) {
      // Update the event used for initial positioning
      clearTimeout(showTimer)
      const text = currentTarget.__tooltipTitle
      if (text) showTimer = setTimeout(() => show(text, e), DELAY)
    }
  })

  // Hide when cursor leaves the tracked element
  document.addEventListener(
    'mouseout',
    (e) => {
      if (!currentTarget) return
      // Only hide if we truly left the element (not moving to a child)
      if (!currentTarget.contains(e.relatedTarget)) {
        hide()
      }
    },
    true
  )

  // Always hide on click or key
  document.addEventListener('click', hide, true)
  document.addEventListener('keydown', hide, true)
  document.addEventListener('scroll', hide, true)
}
