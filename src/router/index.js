import { createRouter, createWebHistory } from 'vue-router'
import WorkspaceDashboard from '../views/WorkspaceDashboard.vue'
import Dashboard from '../views/Dashboard.vue'
import DocumentEditor from '../views/DocumentEditor.vue'
import UserProfile from '../views/UserProfile.vue'
import Settings from '../views/Settings.vue'
import { useWorkspaceStore } from '../stores/workspace'

const routes = [
    {
        path: '/',
        name: 'WorkspaceDashboard',
        component: WorkspaceDashboard
    },
    {
        path: '/profile',
        name: 'UserProfile',
        component: UserProfile
    },
    {
        path: '/settings',
        name: 'Settings',
        component: Settings
    },
    {
        path: '/workspace/:workspaceName',
        name: 'Dashboard',
        component: Dashboard,
        beforeEnter: (to, from, next) => {
            // Validate workspace exists
            const workspaceStore = useWorkspaceStore()
            const workspaceName = decodeURIComponent(to.params.workspaceName)

            if (!workspaceStore.workspaces[workspaceName]) {
                // Workspace doesn't exist, redirect to workspace dashboard
                next('/')
                return
            }

            workspaceStore.setCurrentWorkspace(workspaceName)
            next()
        }
    },
    {
        path: '/workspace/:workspaceName/edit/:name',
        name: 'CvEditor',
        component: DocumentEditor,
        props: { documentType: 'cv' },
        beforeEnter: (to, from, next) => {
            const workspaceStore = useWorkspaceStore()
            const workspaceName = decodeURIComponent(to.params.workspaceName)
            const cvName = decodeURIComponent(to.params.name)

            // Validate workspace and CV exist
            const workspace = workspaceStore.workspaces[workspaceName]
            if (!workspace || !workspace.cvs[cvName]) {
                next(`/workspace/${to.params.workspaceName}`)
                return
            }

            workspaceStore.setCurrentWorkspace(workspaceName)
            next()
        }
    },
    {
        path: '/workspace/:workspaceName/cover-letter/:name',
        name: 'CoverLetterEditor',
        component: DocumentEditor,
        props: { documentType: 'cover-letter' },
        beforeEnter: (to, from, next) => {
            const workspaceStore = useWorkspaceStore()
            const workspaceName = decodeURIComponent(to.params.workspaceName)
            const clName = decodeURIComponent(to.params.name)

            const workspace = workspaceStore.workspaces[workspaceName]
            if (!workspace || !workspace.coverLetters[clName]) {
                next(`/workspace/${to.params.workspaceName}`)
                return
            }

            workspaceStore.setCurrentWorkspace(workspaceName)
            next()
        }
    },
    {
        // Redirect old routes to new structure (for backward compatibility)
        path: '/edit/:name',
        redirect: to => {
            const workspaceStore = useWorkspaceStore()
            const currentWs = workspaceStore.currentWorkspace || 'My Workspace'
            return `/workspace/${encodeURIComponent(currentWs)}/edit/${to.params.name}`
        }
    },
    {
        path: '/cover-letter/:name',
        redirect: to => {
            const workspaceStore = useWorkspaceStore()
            const currentWs = workspaceStore.currentWorkspace || 'My Workspace'
            return `/workspace/${encodeURIComponent(currentWs)}/cover-letter/${to.params.name}`
        }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
