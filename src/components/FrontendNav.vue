<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 当前路由
const currentPath = computed(() => route.path)

// 导航菜单
const navItems = [
  { name: '首页', path: '/' },
  { name: '关于', path: '/about' }
]

// 跳转到登录页面
const goToLogin = () => {
  router.push('/register')
}

// 检查是否已登录
const isLoggedIn = computed(() => {
  return !!localStorage.getItem('token')
})

// 跳转到后台
const goToAdmin = () => {
  router.push('/admin')
}
</script>

<template>
  <nav class="frontend-nav">
    <div class="nav-container">
      <div class="nav-logo" @click="router.push('/')">
        <span>GCB-Blog</span>
      </div>
      
      <div class="nav-links">
        <div 
          v-for="item in navItems" 
          :key="item.path" 
          class="nav-item"
          :class="{ active: currentPath === item.path }"
          @click="router.push(item.path)"
        >
          {{ item.name }}
        </div>
      </div>
      
      <div class="nav-actions">
        <template v-if="isLoggedIn">
          <button class="nav-button admin-button" @click="goToAdmin">
            后台管理
          </button>
        </template>
        <template v-else>
          <button class="nav-button login-button" @click="goToLogin">
            登录
          </button>
        </template>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.frontend-nav {
  background-color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 15px 0;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.nav-logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a2a6c;
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-logo:hover {
  transform: scale(1.05);
}

.nav-links {
  display: flex;
  gap: 30px;
}

.nav-item {
  font-size: 1rem;
  color: #555;
  cursor: pointer;
  position: relative;
  padding: 5px 0;
  transition: all 0.3s ease;
}

.nav-item:hover {
  color: #1a2a6c;
}

.nav-item.active {
  color: #1a2a6c;
  font-weight: 500;
}

.nav-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #1a2a6c;
}

.nav-actions {
  display: flex;
  gap: 15px;
}

.nav-button {
  padding: 8px 20px;
  border-radius: 30px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  outline: none;
}

.login-button {
  background-color: #1a2a6c;
  color: white;
}

.login-button:hover {
  background-color: #15215a;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(26, 42, 108, 0.2);
}

.admin-button {
  background-color: #f0f0f0;
  color: #333;
}

.admin-button:hover {
  background-color: #e0e0e0;
  transform: translateY(-2px);
}

/* 响应式样式 */
@media (max-width: 768px) {
  .nav-links {
    gap: 15px;
  }
  
  .nav-button {
    padding: 6px 15px;
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .nav-logo {
    font-size: 1.2rem;
  }
  
  .nav-links {
    gap: 10px;
  }
  
  .nav-item {
    font-size: 0.9rem;
  }
}
</style> 