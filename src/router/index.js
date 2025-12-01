import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import CvEditor from '../views/CvEditor.vue'

const routes = [
    {
        path: '/',
        name: 'Dashboard',
        component: Dashboard
    },
    {
        path: '/edit/:name',
        name: 'Editor',
        component: CvEditor
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
