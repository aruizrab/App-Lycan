import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingsModal from '../SettingsModal.vue'

describe('SettingsModal', () => {
  it('renders with glass design classes when open', () => {
    const wrapper = mount(SettingsModal, {
      props: { isOpen: true },
      global: {
        stubs: {
          Teleport: true,
          ModelSettings: true,
          SystemPromptsManager: true
        }
      }
    })

    const modal = wrapper.find('.modal')
    expect(modal.exists()).toBe(true)
    expect(modal.classes()).toContain('glass')
    expect(modal.classes()).toContain('sheen')
  })
})
