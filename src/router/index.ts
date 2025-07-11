import { createRouter, createWebHistory } from 'vue-router'
import RegisterAndLoginView from '../views/backend/RegisterAndLoginView.vue'
import HomeView from '../views/frontend/HomeView.vue'
import DetailView from '../views/frontend/DetailView.vue'
import AboutView from '../views/frontend/AboutView.vue'
import AdminView from '../views/backend/AdminView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: {
        title: '首页'
      }
    },
    {
      path: '/detail/:id',
      name: 'detail',
      component: DetailView,
      props: true,
      meta: {
        title: '文章详情'
      }
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView,
      meta: {
        title: '关于我'
      }
    },
    {
      path: '/register',
      name: 'registerAndLogin',
      component: RegisterAndLoginView,
      meta: {
        title: '登录和注册页面'
      }
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminView,
      meta: {
        title: '后台管理',
        requiresAuth: true
      }
    },
  ],
})

// 全局路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title as string || '网站'
  
  // 检查该路由是否需要认证
  if (to.matched.some(record => record.meta.requiresAuth)) {
    // 获取token判断是否已登录
    const token = localStorage.getItem('token')
    
    if (!token) {
      // 未登录则跳转到登录页面
      next({
        path: '/register',
        query: { redirect: to.fullPath } // 保存原目标路径，登录后可跳回
      })
    } else {
      // 已登录，放行
      next()
    }
  } else {
    // 不需要认证的页面，直接放行
    next()
  }
})

export default router
