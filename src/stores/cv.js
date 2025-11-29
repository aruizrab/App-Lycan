import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCvStore = defineStore('cv', () => {
  const cv = ref({
    personalInfo: {
      name: '',
      role: '',
      picture: '', // URL or base64
      aboutMe: '',
      contact: [
        { id: 'email', type: 'email', value: '', icon: 'mail' },
        { id: 'phone', type: 'phone', value: '', icon: 'phone' }
      ]
    },
    sections: [
      { id: 'experience', title: 'Experience', type: 'experience', items: [], visible: true },
      { id: 'projects', title: 'Projects', type: 'projects', items: [], visible: true },
      { id: 'education', title: 'Education', type: 'education', items: [], visible: true },
      { id: 'skills', title: 'Skills', type: 'skills', content: '', visible: true },
      { id: 'certifications', title: 'Certifications', type: 'certifications', items: [], visible: true }
    ]
  })

  const addContactField = () => {
    cv.value.personalInfo.contact.push({
      id: Date.now().toString(),
      type: 'url',
      value: '',
      icon: 'globe'
    })
  }

  const removeContactField = (index) => {
    cv.value.personalInfo.contact.splice(index, 1)
  }

  const addSectionItem = (sectionId) => {
    const section = cv.value.sections.find(s => s.id === sectionId)
    if (section) {
      if (section.type === 'skills') {
        // Skills are just a list of strings, handled differently in UI usually, 
        // but here we might want structured items or just a text block. 
        // User said "comma separated list", so maybe just a single string field in the section?
        // Or a list of strings. Let's stick to the user request: "comma separated list".
        // So for skills, 'items' might not be used, or used as tags.
        // Let's assume skills section has a 'content' property or we parse a string.
        // Let's add a 'content' property to sections for generic text or simple lists.
      } else {
        section.items.push({
          id: Date.now().toString(),
          title: '',
          subtitle: '', // Company/Organization
          location: '',
          dateRange: '',
          isCurrent: false,
          description: ''
        })
      }
    }
  }

  const removeSectionItem = (sectionId, index) => {
    const section = cv.value.sections.find(s => s.id === sectionId)
    if (section) {
      section.items.splice(index, 1)
    }
  }

  return { cv, addContactField, removeContactField, addSectionItem, removeSectionItem }
})
