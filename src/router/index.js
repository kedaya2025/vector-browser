import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

import Layout from '@/layout'

export const constantRoutes = [
  {
    path: '/404',
    component: require('@/views/error-page/404').default,
    hidden: true
  },
  {
    path: '/',
    component: Layout,
    redirect: '/index',
    meta: { title: '环境管理', icon: 'list' },
    children: [
      {
        path: 'index',
        component: require('@/views/browser/index').default,
        name: 'Browser',
        meta: { title: '环境管理', icon: 'list', affix: true }
      }
    ]
  },
  {
    path: '/group',
    component: Layout,
    meta: { title: '环境分组', icon: 'tab' },
    children: [
      {
        path: '',
        component: require('@/views/browser/group').default,
        name: 'Group',
        meta: { title: '环境分组', icon: 'tab', affix: true }
      }
    ]
  },
  {
    path: '/settings',
    component: Layout,
    meta: { title: '全局设置', icon: 'setting' },
    children: [
      {
        path: '',
        component: require('@/views/settings/index').default,
        name: 'Settings',
        meta: { title: '全局设置', icon: 'setting', affix: true }
      }
    ]
  },
  {
    path: '/extensions',
    component: Layout,
    meta: { title: '插件管理', icon: 'component' },
    children: [
      {
        path: '',
        component: require('@/views/crx/index').default,
        name: 'Extensions',
        meta: { title: '插件管理', icon: 'component', affix: true }
      }
    ]
  },
  { path: '*', redirect: '/404', hidden: true }
]

const createRouter = () =>
  new Router({
    scrollBehavior: () => ({ y: 0 }),
    routes: constantRoutes
  })

const router = createRouter()

export function resetRouter() {
  const newRouter = createRouter()
  router.matcher = newRouter.matcher
}

export default router
