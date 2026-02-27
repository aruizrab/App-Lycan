import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingsModal from '../SettingsModal.vue'

describe('SettingsModal', () => {
  it('applies dark-mode friendly color classes to the header settings icon', () => {
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

    const icon = wrapper.find('svg.w-6.h-6')
    expect(icon.classes()).toContain('text-gray-900')
    expect(icon.classes()).toContain('dark:text-white')
  })
})
