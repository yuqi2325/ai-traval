import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import Home from '../views/layout/compontent/Home.vue'
import Chat from '../views/layout/compontent/Chat.vue'
import Profile from '../views/layout/compontent/Profile.vue'
import Layout from '../views/layout/index.vue'
import Detail from '../views/layout/compontent/Detail.vue'

//演示模式部署在 GitHub Pages，使用 hash 路由避免刷新 404
const history = import.meta.env.VITE_DEMO_MODE === 'true'
  ? createWebHashHistory()
  : createWebHistory(import.meta.env.BASE_URL)

const router = createRouter({
  history,
  routes: [
    {
      path: '/',
      name: 'layout',
      component: Layout,
      children: [
        {
          path: '/',
          name: 'home',
          component: Home
        },
        {
          path: '/chat',
          name: 'chat',
          component: Chat
        },
        {
          path: '/profile',
          name: 'profile',
          component: Profile
        },
        {
          path:'/detail',
          name:'detail',
          component:Detail
        }
      ]
    }
  ]


})

export default router
