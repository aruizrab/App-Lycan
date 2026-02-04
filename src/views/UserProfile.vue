<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUserProfileStore } from '../stores/userProfile'
import RichTextEditor from '../components/RichTextEditor.vue'
import {
    ArrowLeft,
    User,
    Save,
    RotateCcw,
    Download,
    Upload,
    Moon,
    Sun,
    Clock,
    CheckCircle,
    AlertCircle
} from 'lucide-vue-next'

const router = useRouter()
const userProfileStore = useUserProfileStore()
const { professionalExperience, lastModified } = storeToRefs(userProfileStore)

// Local state
const isSaving = ref(false)
const saveMessage = ref(null)
const fileInput = ref(null)

// Form data (local copy for editing)
const formData = ref({
    professionalExperience: ''
})

// Load data on mount
onMounted(() => {
    formData.value = {
        professionalExperience: professionalExperience.value || ''
    }
})

// Computed
const lastModifiedFormatted = computed(() => {
    const timestamp = lastModified.value
    if (!timestamp) return null
    return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
})

const hasUnsavedChanges = computed(() => {
    const storeValue = professionalExperience.value || ''
    const formValue = formData.value.professionalExperience || ''
    return formValue !== storeValue
})

// Methods
const saveProfile = () => {
    isSaving.value = true

    try {
        userProfileStore.updateProfessionalExperience(formData.value.professionalExperience)

        saveMessage.value = { type: 'success', text: 'Profile saved successfully!' }
        setTimeout(() => {
            saveMessage.value = null
        }, 3000)
    } catch (e) {
        saveMessage.value = { type: 'error', text: e.message }
    } finally {
        isSaving.value = false
    }
}

const resetForm = () => {
    if (!hasUnsavedChanges.value) return

    if (confirm('Are you sure you want to discard your changes?')) {
        formData.value = {
            professionalExperience: professionalExperience.value || ''
        }
    }
}

const exportProfile = () => {
    const dataStr = userProfileStore.exportProfile()
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'user-profile.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

const triggerImport = () => {
    fileInput.value?.click()
}

const handleImport = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
        const success = userProfileStore.importProfile(e.target.result)
        if (success) {
            // Reload form data
            formData.value = {
                professionalExperience: professionalExperience.value || ''
            }
            saveMessage.value = { type: 'success', text: 'Profile imported successfully!' }
        } else {
            saveMessage.value = { type: 'error', text: 'Failed to import profile. Invalid file format.' }
        }
        setTimeout(() => {
            saveMessage.value = null
        }, 3000)
    }
    reader.readAsText(file)
    event.target.value = ''
}

const goBack = () => {
    if (hasUnsavedChanges.value) {
        if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
            return
        }
    }
    router.push('/')
}

// Theme
const isDark = ref(document.documentElement.classList.contains('dark'))

const toggleTheme = () => {
    isDark.value = !isDark.value
    if (isDark.value) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
    } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
    }
}
</script>

<template>
    <div class="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
        <!-- Header -->
        <header class="bg-white dark:bg-gray-800 shadow border-b dark:border-gray-700 sticky top-0 z-10">
            <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <button
                        @click="goBack"
                        class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
                    >
                        <ArrowLeft :size="24" />
                    </button>
                    <div class="flex items-center gap-3">
                        <div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <User :size="24" class="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h1 class="text-xl font-bold text-gray-900 dark:text-white">User Profile</h1>
                            <p class="text-sm text-gray-500 dark:text-gray-400">Your professional details for AI-powered applications</p>
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <!-- Save indicator -->
                    <div v-if="lastModifiedFormatted" class="hidden sm:flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mr-2">
                        <Clock :size="14" />
                        Last saved: {{ lastModifiedFormatted }}
                    </div>

                    <!-- Import/Export -->
                    <button
                        @click="triggerImport"
                        class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                        title="Import Profile"
                    >
                        <Upload :size="20" />
                    </button>
                    <input
                        ref="fileInput"
                        type="file"
                        accept=".json"
                        class="hidden"
                        @change="handleImport"
                    />
                    <button
                        @click="exportProfile"
                        class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                        title="Export Profile"
                    >
                        <Download :size="20" />
                    </button>

                    <div class="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                    <!-- Theme toggle -->
                    <button
                        @click="toggleTheme"
                        class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                        title="Toggle Theme"
                    >
                        <Moon v-if="isDark" :size="20" />
                        <Sun v-else :size="20" />
                    </button>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-4xl mx-auto px-4 py-8">
            <!-- Save Message -->
            <div
                v-if="saveMessage"
                class="mb-6 p-4 rounded-lg flex items-center gap-3"
                :class="{
                    'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200': saveMessage.type === 'success',
                    'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200': saveMessage.type === 'error'
                }"
            >
                <CheckCircle v-if="saveMessage.type === 'success'" :size="20" />
                <AlertCircle v-else :size="20" />
                {{ saveMessage.text }}
            </div>

            <!-- Professional Experience -->
            <section class="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 p-6 mb-6">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Professional Profile</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Write a comprehensive profile including your contact information, professional experience, skills, achievements, and career highlights.
                    This will be used by the AI to create personalized CVs and cover letters tailored to each job application.
                </p>

                <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden profile-editor-container">
                    <RichTextEditor v-model="formData.professionalExperience" />
                </div>

                <div class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">💡 Tips for better AI results:</h4>
                    <ul class="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        <li>• Start with contact info (name, email, phone, location, LinkedIn, portfolio)</li>
                        <li>• Include specific achievements with numbers (e.g., "Increased sales by 40%")</li>
                        <li>• List technical skills and tools you're proficient with</li>
                        <li>• Mention leadership experience and team sizes</li>
                        <li>• Include education, certifications, and awards</li>
                        <li>• Describe key projects and their impact</li>
                    </ul>
                </div>
            </section>

            <!-- Action Buttons -->
            <div class="flex items-center justify-between">
                <button
                    @click="resetForm"
                    :disabled="!hasUnsavedChanges"
                    class="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <RotateCcw :size="18" />
                    Discard Changes
                </button>

                <button
                    @click="saveProfile"
                    :disabled="!hasUnsavedChanges || isSaving"
                    class="flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Save :size="18" />
                    {{ isSaving ? 'Saving...' : 'Save Profile' }}
                </button>
            </div>

            <!-- Unsaved changes indicator -->
            <div v-if="hasUnsavedChanges" class="mt-4 text-center">
                <span class="text-sm text-orange-600 dark:text-orange-400 flex items-center justify-center gap-2">
                    <AlertCircle :size="16" />
                    You have unsaved changes
                </span>
            </div>
        </main>
    </div>
</template>

<style scoped>
/* Make the editor toolbar sticky and content scrollable */
.profile-editor-container {
    max-height: 500px;
    display: flex;
    flex-direction: column;
}

.profile-editor-container :deep(.border.rounded-md) {
    border: none;
    border-radius: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.profile-editor-container :deep(.bg-gray-50.dark\:bg-gray-700) {
    position: sticky;
    top: 0;
    z-index: 10;
    flex-shrink: 0;
}

.profile-editor-container :deep(.ProseMirror) {
    overflow-y: auto;
    max-height: calc(500px - 44px); /* Subtract toolbar height */
    min-height: 200px;
}
</style>
