/**
 * Composable: useAppContext
 *
 * Provides reactive app context (current view, workspace tree, etc.)
 * for use in components and AI prompt building.
 */

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { buildAppContext, getCurrentView } from '../services/dataAccess'

export function useAppContext() {
    const route = useRoute()

    /** Reactive current view name */
    const currentView = computed(() => getCurrentView(route))

    /** Reactive full app context object (for system prompts) */
    const appContext = computed(() => buildAppContext(route))

    /** JSON string of app context for embedding in prompts */
    const appContextJson = computed(() => JSON.stringify(appContext.value, null, 2))

    return {
        currentView,
        appContext,
        appContextJson
    }
}
