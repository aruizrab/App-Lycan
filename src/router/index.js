import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import DocumentEditor from '../views/DocumentEditor.vue'

const routes = [
    {
        path: '/',
        name: 'Dashboard',
        component: Dashboard
    },
    {
        path: '/edit/:name',
        name: 'Editor',
        component: DocumentEditor,
        props: { documentType: 'cv' }
    },
    {
        path: '/cover-letter/:name',
        name: 'CoverLetterEditor',
        component: DocumentEditor,
        props: { documentType: 'cover-letter' }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
