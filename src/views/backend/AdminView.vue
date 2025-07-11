<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import {
  User, Document, Menu as MenuIcon,
  Histogram, Fold, Expand, Search,
  Plus, Delete, Edit, Setting,
  Moon, Sunny, Calendar, Key, Lock,
  Refresh, Download, Check, Ticket,
  Tools
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import { useUserStore } from '../../stores/user'
import * as adminApi from '../../api/admin'
import { updateUserNickname } from '../../api/admin'
import ArticleView from './ArticleView.vue'
import LabelView from './LabelView.vue'
import ContentView from './ContentView.vue'
import ProfileView from './ProfileView.vue'

// 用户状态管理
const userStore = useUserStore()

// 主题设置
const isDarkMode = ref(false)
const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value

  // 更新Element Plus的暗黑模式
  const html = document.documentElement
  html.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light')

  // 设置Element Plus的暗黑模式
  if (isDarkMode.value) {
    html.classList.add('dark')
  } else {
    html.classList.remove('dark')
  }
}

// 检测系统暗黑模式
const checkSystemDarkMode = () => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    isDarkMode.value = true
    const html = document.documentElement
    html.setAttribute('data-theme', 'dark')
    html.classList.add('dark')
  }

  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    isDarkMode.value = event.matches
    const html = document.documentElement
    html.setAttribute('data-theme', event.matches ? 'dark' : 'light')

    if (event.matches) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  })
}

// 侧边栏收缩状态
const isCollapse = ref(false)
const toggleSidebar = () => {
  isCollapse.value = !isCollapse.value
}

// 左侧菜单激活状态
const activeIndex = ref('1')

// 菜单选择处理
const handleSelect = (index: string) => {
  activeIndex.value = index
  currentComponent.value = menuComponents[index]
  currentTitle.value = menuTitles[index]

  // 如果切换到用户管理，自动加载用户列表
  if (index === '1') {
    loadUserList()
  }
}

// 当前显示的组件
const currentComponent = ref('UserManagement')
const currentTitle = ref('用户管理')

// 菜单对应的组件
const menuComponents: Record<string, string> = {
  '1': 'UserManagement',
  '2': 'ArticleManagement',
  '3': 'TagManagement',
  '5': 'UserSettings'
}

// 菜单对应的标题
const menuTitles: Record<string, string> = {
  '1': '用户管理',
  '2': '文章管理',
  '3': '标签管理',
  '5': '个人设置'
}

// 用户数据
interface UserData {
  id: number
  username: string
  nickname?: string  // 添加昵称字段
  password: string
  createTime: string
  updateTime: string
}

const tableData = ref<UserData[]>([])

// 表格加载状态
const loading = ref(false)

// 表格分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 处理分页变化
const handleCurrentChange = (val: number) => {
  pagination.currentPage = val
  loadUserList()
}

// 处理每页显示记录数变化
const handleSizeChange = (val: number) => {
  pagination.pageSize = val
  pagination.currentPage = 1
  loadUserList()
}

// 搜索关键字
const searchKeyword = ref('')

// 搜索处理
const handleSearch = () => {
  pagination.currentPage = 1
  loadUserList()
}

// 加载用户列表
const loadUserList = async () => {
  loading.value = true;
  try {
    const res = await adminApi.getAllUsers();

    if (res) {
      // 检查数据结构
      let userData = null;
      const data = res as any;

      // 直接使用数组数据
      if (Array.isArray(data)) {
        userData = data;
      } else if (data.data && Array.isArray(data.data)) {
        // {data: [...]} 结构
        userData = data.data;
      }

      if (userData) {
        // 根据搜索关键字过滤
        let filteredData = userData;
        if (searchKeyword.value) {
          const keyword = searchKeyword.value.toLowerCase();
          filteredData = filteredData.filter((item: UserData) =>
            item.username.toLowerCase().includes(keyword)
          );
        }

        // 计算总数据量
        pagination.total = filteredData.length;

        // 分页处理
        const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
        const endIndex = startIndex + pagination.pageSize;
        tableData.value = filteredData.slice(startIndex, endIndex);
      } else {
        ElMessage.error('获取用户列表失败：数据格式不支持');
        tableData.value = [];
      }
    } else {
      ElMessage.error('获取用户列表失败：返回数据为空');
      tableData.value = [];
    }
  } catch (error) {
    ElMessage.error('获取用户列表失败，请检查网络连接');
    tableData.value = [];
  } finally {
    loading.value = false;
  }
}

// 删除用户
const handleDeleteUser = (id: number) => {
  ElMessageBox.confirm('确定要删除此用户吗？此操作不可恢复！', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    loading.value = true
    try {
      await adminApi.deleteUser(id)
      ElMessage.success('用户删除成功')
      loadUserList() // 重新加载用户列表
    } catch (error) {
      ElMessage.error('删除用户失败')
    } finally {
      loading.value = false
    }
  }).catch(() => {
    // 用户取消删除
  })
}

// 修改注册码对话框
const registerCodeDialogVisible = ref(false)
const registerCodeForm = reactive({
  oldCode: '',
  newCode: '',
})
const registerCodeFormRef = ref()

// 打开修改注册码对话框
const openRegisterCodeDialog = () => {
  registerCodeForm.oldCode = ''
  registerCodeForm.newCode = ''
  registerCodeDialogVisible.value = true
}

// 提交修改注册码
const submitRegisterCodeChange = async () => {
  if (!registerCodeFormRef.value) return

  await registerCodeFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      try {
        loading.value = true
        await adminApi.updateRegisterCode({
          oldCode: registerCodeForm.oldCode,
          newCode: registerCodeForm.newCode,
        })
        ElMessage.success('注册码修改成功')
        registerCodeDialogVisible.value = false
      } catch (error) {
        ElMessage.error('修改注册码失败')
      } finally {
        loading.value = false
      }
    }
  })
}

// 退出登录
const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    userStore.logout()
    ElMessage.success('退出登录成功')
  }).catch(() => { })
}

// 用户信息
const userInfo = reactive({
  name: computed(() => userStore.username || '管理员'),
  avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'
})

// 获取浏览器窗口宽度
const windowWidth = ref(window.innerWidth)
const isMobile = ref(windowWidth.value < 768)

// 监听窗口大小变化
onMounted(() => {
  // 检测系统暗黑模式
  checkSystemDarkMode()

  // 加载用户列表
  loadUserList()

  window.addEventListener('resize', () => {
    windowWidth.value = window.innerWidth
    isMobile.value = windowWidth.value < 768

    if (isMobile.value && !isCollapse.value) {
      isCollapse.value = true
    }
  })
})

// 修改密码对话框
const passwordDialogVisible = ref(false)
const passwordForm = reactive({
  userId: 0,
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const passwordFormRef = ref()

// 密码验证规则
const validatePass = (rule: any, value: any, callback: any) => {
  if (value === '') {
    callback(new Error('请输入密码'))
  } else {
    if (passwordForm.confirmPassword !== '') {
      passwordFormRef.value.validateField('confirmPassword')
    }
    callback()
  }
}

const validateConfirmPass = (rule: any, value: any, callback: any) => {
  if (value === '') {
    callback(new Error('请再次输入密码'))
  } else if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, validator: validatePass, trigger: 'blur' },
    { min: 6, message: '密码长度不能小于6个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, validator: validateConfirmPass, trigger: 'blur' }
  ],
}

// 打开修改密码对话框
const openPasswordDialog = (userId: number) => {
  // 如果是修改其他用户的密码，使用重置密码功能
  if (userId !== 0) {
    openResetPasswordDialog(userId)
    return
  }

  // 修改自己的密码
  passwordForm.userId = userId
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  passwordDialogVisible.value = true
}

// 重置密码对话框
const resetPasswordDialogVisible = ref(false)
const resetPasswordForm = reactive({
  userId: 0,
  username: '',
  newPassword: '',
  confirmPassword: '',
})
const resetPasswordFormRef = ref()

// 重置密码验证规则
const validateResetPass = (rule: any, value: any, callback: any) => {
  if (value === '') {
    callback(new Error('请输入新密码'))
  } else {
    if (resetPasswordForm.confirmPassword !== '') {
      resetPasswordFormRef.value.validateField('confirmPassword')
    }
    callback()
  }
}

const validateResetConfirmPass = (rule: any, value: any, callback: any) => {
  if (value === '') {
    callback(new Error('请再次输入新密码'))
  } else if (value !== resetPasswordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const resetPasswordRules = {
  newPassword: [
    { required: true, validator: validateResetPass, trigger: 'blur' },
    { min: 6, message: '密码长度不能小于6个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, validator: validateResetConfirmPass, trigger: 'blur' }
  ],
}

// 打开重置密码对话框
const openResetPasswordDialog = async (userId: number) => {
  try {
    loading.value = true
    // 获取用户信息
    const userInfo = await adminApi.getUserById(userId)
    resetPasswordForm.userId = userId
    resetPasswordForm.username = userInfo.username || `user-${userId}`
    resetPasswordForm.newPassword = ''
    resetPasswordForm.confirmPassword = ''
    resetPasswordDialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取用户信息失败')
  } finally {
    loading.value = false
  }
}

// 提交重置密码
const submitResetPassword = async () => {
  if (!resetPasswordFormRef.value) return

  await resetPasswordFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      try {
        loading.value = true
        await adminApi.resetUserPassword(resetPasswordForm.username, resetPasswordForm.newPassword)
        ElMessage.success('密码重置成功')
        resetPasswordDialogVisible.value = false
      } catch (error) {
        ElMessage.error('重置密码失败')
      } finally {
        loading.value = false
      }
    }
  })
}

// 提交修改密码
const submitPasswordChange = async () => {
  if (!passwordFormRef.value) return

  await passwordFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      try {
        loading.value = true
        await adminApi.updateUserPassword({
          userId: passwordForm.userId,
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
        })
        ElMessage.success('密码修改成功')
        passwordDialogVisible.value = false
      } catch (error) {
        ElMessage.error('修改密码失败')
      } finally {
        loading.value = false
      }
    }
  })
}

// 格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

// 格式化时间
const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString()
}

// 随机状态
const getRandomStatus = () => {
  const statuses = ['status-online', 'status-away', 'status-offline']
  return statuses[Math.floor(Math.random() * statuses.length)]
}

// 表格行样式
const tableRowClassName = ({ row, rowIndex }: { row: any, rowIndex: number }) => {
  return rowIndex % 2 === 0 ? 'even-row' : 'odd-row'
}

// 修改昵称对话框
const nicknameDialogVisible = ref(false)
const nicknameForm = reactive({
  userId: 0,
  username: '',
  nickname: '',
})
const nicknameFormRef = ref()

// 昵称验证规则
const validateNickname = (rule: any, value: any, callback: any) => {
  if (!value) {
    return callback(new Error('昵称不能为空'))
  }
  if (value.length < 1) {
    return callback(new Error('昵称长度不能小于1个字符'))
  }
  if (value.length > 20) {
    return callback(new Error('昵称长度不能超过20个字符'))
  }
  callback()
}

const nicknameRules = {
  nickname: [
    { required: true, validator: validateNickname, trigger: 'blur' }
  ]
}

// 打开修改昵称对话框
const openEditNicknameDialog = (user: UserData) => {
  nicknameForm.userId = user.id
  nicknameForm.username = user.username
  nicknameForm.nickname = user.nickname || ''
  nicknameDialogVisible.value = true
}

// 提交修改昵称
const submitNicknameChange = async () => {
  if (!nicknameFormRef.value) return

  await nicknameFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      try {
        loading.value = true
        const requestData = { userId: nicknameForm.userId, nickname: nicknameForm.nickname }

        const response = await updateUserNickname(nicknameForm.userId, nicknameForm.nickname)

        // 检查响应是否成功
        let success = false

        if (response) {
          if (typeof response === 'object') {
            // 检查不同的响应格式
            if ('message' in response && response.message === "昵称修改成功") {
              success = true
            } else if (response.data && typeof response.data === 'object' && 'message' in response.data && response.data.message === "昵称修改成功") {
              success = true
            } else if ('success' in response && response.success === true) {
              success = true
            }
          }
        }

        if (success) {
          ElMessage.success('昵称修改成功')
          nicknameDialogVisible.value = false
          // 重新加载用户列表以更新数据
          await loadUserList()
        } else {
          throw new Error('服务器返回未能识别的响应格式')
        }
      } catch (error) {
        ElMessage.error('修改昵称失败')
      } finally {
        loading.value = false
      }
    }
  })
}

</script>

<template>
  <div class="admin-container" :class="{ 'dark-theme': isDarkMode }">
    <!-- 左侧导航 -->
    <div class="admin-sidebar" :class="{ 'collapsed': isCollapse }">
      <div class="admin-logo">
        <img src="/favicon.ico" alt="Logo" />
        <span v-show="!isCollapse">后台管理系统</span>
      </div>
      <el-menu :default-active="activeIndex" class="admin-menu" :collapse="isCollapse" @select="handleSelect">
        <el-menu-item index="1">
          <el-icon>
            <User />
          </el-icon>
          <template #title>用户管理</template>
        </el-menu-item>
        <el-menu-item index="2">
          <el-icon>
            <Document />
          </el-icon>
          <template #title>文章管理</template>
        </el-menu-item>
        <el-menu-item index="3">
          <el-icon>
            <MenuIcon />
          </el-icon>
          <template #title>标签管理</template>
        </el-menu-item>
        <el-menu-item index="5">
          <el-icon>
            <Setting />
          </el-icon>
          <template #title>个人设置</template>
        </el-menu-item>
      </el-menu>

      <!-- 收缩按钮 -->
      <div class="sidebar-toggle" @click="toggleSidebar">
        <el-icon :size="16">
          <Fold v-if="!isCollapse" />
          <Expand v-else />
        </el-icon>
      </div>
    </div>

    <!-- 右侧内容 -->
    <div class="admin-content" :class="{ 'expanded': isCollapse }">
      <!-- 顶部导航 -->
      <div class="admin-header">
        <div class="header-left">
          <h2>{{ currentTitle }}</h2>
        </div>
        <div class="header-right">
          <!-- 主题切换 -->
          <div class="theme-switch" @click="toggleDarkMode">
            <el-icon :size="20">
              <Moon v-if="!isDarkMode" />
              <Sunny v-else />
            </el-icon>
          </div>

          <div class="search-box">
            <el-input v-model="searchKeyword" placeholder="搜索..." class="search-input" @keyup.enter="handleSearch">
              <template #prefix>
                <el-icon class="search-icon">
                  <Search />
                </el-icon>
              </template>
            </el-input>
          </div>

          <el-dropdown trigger="click">
            <div class="user-profile">
              <el-avatar :size="32" :src="userInfo.avatar"></el-avatar>
              <span class="user-name">{{ userInfo.name }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="openPasswordDialog(0)">
                  <el-icon>
                    <Setting />
                  </el-icon>
                  <span>修改密码</span>
                </el-dropdown-item>
                <el-dropdown-item @click="openRegisterCodeDialog()">
                  <el-icon>
                    <Setting />
                  </el-icon>
                  <span>修改注册码</span>
                </el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">
                  <span>退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- 主要内容区域 -->
      <div class="admin-main">
        <!-- 用户管理 -->
        <div v-if="currentComponent === 'UserManagement'" class="fade-in">
          <div class="dashboard-header">
            <div class="dashboard-title">
              <h3>用户管理中心</h3>
              <p class="subtitle">管理系统中的所有用户账号与权限</p>
            </div>
            <div class="dashboard-actions">
              <div class="search-container">
                <el-input v-model="searchKeyword" placeholder="搜索用户名..." class="search-input"
                  @keyup.enter="handleSearch" clearable>
                  <template #prefix>
                    <el-icon class="search-icon">
                      <Search />
                    </el-icon>
                  </template>
                </el-input>
              </div>
              <el-button type="primary" @click="handleSearch" class="action-btn primary-gradient">
                <el-icon>
                  <Refresh />
                </el-icon>刷新
              </el-button>
            </div>
          </div>

          <div class="dashboard-stats">
            <div class="stat-card">
              <div class="stat-icon">
                <el-icon>
                  <User />
                </el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ pagination.total }}</div>
                <div class="stat-label">总用户数</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">
                <el-icon>
                  <Calendar />
                </el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ new Date().toLocaleDateString() }}</div>
                <div class="stat-label">今日日期</div>
              </div>
            </div>
          </div>

          <el-card shadow="hover" class="data-card">
            <template #header>
              <div class="card-header">
                <span>用户列表</span>
                <div class="header-actions">
                  <!-- 删除导出数据和表格设置按钮 -->
                </div>
              </div>
            </template>

            <el-table :data="tableData" style="width: 100%" v-loading="loading" row-key="id" border
              :row-class-name="tableRowClassName" highlight-current-row :header-cell-style="{
                background: 'var(--header-bg-color)',
                color: 'var(--header-text-color)',
                fontWeight: '600',
                fontSize: '14px',
                height: '55px'
              }" :cell-style="{
                fontSize: '14px',
                padding: '12px 0'
              }" class="elegant-table">
              <el-table-column type="expand">
                <template #default="props">
                  <div class="user-detail">
                    <div class="detail-section">
                      <div class="detail-header">用户信息</div>
                      <div class="detail-content">
                        <div class="detail-item">
                          <div class="detail-icon"><el-icon>
                              <User />
                            </el-icon></div>
                          <div class="detail-info">
                            <span class="label">用户ID</span>
                            <span class="value">{{ props.row.id }}</span>
                          </div>
                        </div>
                        <div class="detail-item">
                          <div class="detail-icon"><el-icon>
                              <User />
                            </el-icon></div>
                          <div class="detail-info">
                            <span class="label">昵称</span>
                            <span class="value">{{ props.row.nickname || '未设置昵称' }}</span>
                          </div>
                        </div>
                        <div class="detail-item">
                          <div class="detail-icon"><el-icon>
                              <Calendar />
                            </el-icon></div>
                          <div class="detail-info">
                            <span class="label">创建时间</span>
                            <span class="value">{{ new Date(props.row.createTime).toLocaleString() }}</span>
                          </div>
                        </div>
                        <div class="detail-item">
                          <div class="detail-icon"><el-icon>
                              <Calendar />
                            </el-icon></div>
                          <div class="detail-info">
                            <span class="label">更新时间</span>
                            <span class="value">{{ new Date(props.row.updateTime).toLocaleString() }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="detail-section">
                      <div class="detail-header">操作记录</div>
                      <div class="detail-content">
                        <div class="detail-timeline">
                          <div class="timeline-item">
                            <div class="timeline-dot"></div>
                            <div class="timeline-content">
                              <div class="timeline-title">用户创建</div>
                              <div class="timeline-time">{{ new Date(props.row.createTime).toLocaleString() }}</div>
                            </div>
                          </div>
                          <div class="timeline-item">
                            <div class="timeline-dot"></div>
                            <div class="timeline-content">
                              <div class="timeline-title">最近更新</div>
                              <div class="timeline-time">{{ new Date(props.row.updateTime).toLocaleString() }}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </el-table-column>

              <el-table-column type="selection" width="50" align="center"></el-table-column>
              <el-table-column prop="id" label="ID" width="80" align="center">
                <template #default="scope">
                  <div class="id-badge">{{ scope.row.id }}</div>
                </template>
              </el-table-column>
              <el-table-column prop="username" label="用户名" min-width="180" align="center">
                <template #default="scope">
                  <div class="username-cell">
                    <div class="avatar-wrapper">
                      <el-avatar :size="40" :src="`https://api.dicebear.com/7.x/micah/svg?seed=${scope.row.username}`"
                        class="user-avatar"></el-avatar>
                      <div class="status-dot" :class="getRandomStatus()"></div>
                    </div>
                    <div class="user-info">
                      <div class="username-text">{{ scope.row.username }}</div>
                      <div class="user-subtitle">用户</div>
                    </div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="nickname" label="昵称" min-width="150" align="center">
                <template #default="scope">
                  <div class="nickname-cell">
                    <span class="nickname-text">{{ scope.row.nickname || '未设置昵称' }}</span>
                    <el-button type="primary" size="small" text class="edit-btn"
                      @click="openEditNicknameDialog(scope.row)">
                      <el-icon>
                        <Edit />
                      </el-icon>
                    </el-button>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="createTime" label="创建时间" min-width="180" align="center">
                <template #default="scope">
                  <div class="time-cell">
                    <div class="time-icon">
                      <el-icon>
                        <Calendar />
                      </el-icon>
                    </div>
                    <div class="time-info">
                      <div class="time-main">{{ formatDate(scope.row.createTime) }}</div>
                      <div class="time-detail">{{ formatTime(scope.row.createTime) }}</div>
                    </div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="updateTime" label="更新时间" min-width="180" align="center">
                <template #default="scope">
                  <div class="time-cell">
                    <div class="time-icon">
                      <el-icon>
                        <Calendar />
                      </el-icon>
                    </div>
                    <div class="time-info">
                      <div class="time-main">{{ formatDate(scope.row.updateTime) }}</div>
                      <div class="time-detail">{{ formatTime(scope.row.updateTime) }}</div>
                    </div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="操作" fixed="right" min-width="150" align="center">
                <template #default="scope">
                  <div class="action-buttons">
                    <el-tooltip content="修改昵称" placement="top" :show-after="500">
                      <el-button type="primary" circle @click="openEditNicknameDialog(scope.row)" class="action-button">
                        <el-icon>
                          <Edit />
                        </el-icon>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="重置密码" placement="top" :show-after="500">
                      <el-button type="primary" circle @click="openResetPasswordDialog(scope.row.id)"
                        class="action-button">
                        <el-icon>
                          <Key />
                        </el-icon>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="删除用户" placement="top" :show-after="500">
                      <el-button type="danger" circle @click="handleDeleteUser(scope.row.id)" class="action-button">
                        <el-icon>
                          <Delete />
                        </el-icon>
                      </el-button>
                    </el-tooltip>
                  </div>
                </template>
              </el-table-column>
            </el-table>

            <div class="table-empty" v-if="tableData.length === 0 && !loading">
              <el-empty description="暂无用户数据" :image-size="80">
                <template #image>
                  <el-icon :size="60" class="empty-icon">
                    <User />
                  </el-icon>
                </template>
              </el-empty>
            </div>

            <div class="pagination-container">
              <el-pagination v-model:currentPage="pagination.currentPage" v-model:page-size="pagination.pageSize"
                :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper"
                :total="pagination.total" @size-change="handleSizeChange" @current-change="handleCurrentChange"
                background class="elegant-pagination"></el-pagination>
            </div>
          </el-card>
        </div>

        <!-- 文章管理 -->
        <ArticleView v-if="currentComponent === 'ArticleManagement'" />
        
        <!-- 标签管理 -->
        <LabelView v-if="currentComponent === 'TagManagement'" />
        
        <!-- 内容管理 -->
        <ContentView v-if="currentComponent === 'ContentManagement'" />
        
        <!-- 个人设置 -->
        <ProfileView v-if="currentComponent === 'UserSettings'" />
        
      </div>
    </div>

    <!-- 修改密码对话框 -->
    <el-dialog v-model="passwordDialogVisible" title="修改密码" width="400px" center destroy-on-close
      custom-class="elegant-dialog">
      <div class="dialog-icon">
        <div class="icon-circle">
          <el-icon :size="32">
            <Lock />
          </el-icon>
        </div>
      </div>
      <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-position="top"
        class="elegant-form">
        <el-form-item label="当前密码" prop="oldPassword">
          <el-input v-model="passwordForm.oldPassword" type="password" placeholder="请输入当前密码" show-password
            class="elegant-input">
            <template #prefix>
              <el-icon>
                <Lock />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码" show-password
            class="elegant-input">
            <template #prefix>
              <el-icon>
                <Lock />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" show-password
            class="elegant-input">
            <template #prefix>
              <el-icon>
                <Check />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="passwordDialogVisible = false" plain class="cancel-btn">取消</el-button>
          <el-button type="primary" @click="submitPasswordChange" :loading="loading"
            class="primary-gradient confirm-btn">确认修改</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 修改注册码对话框 -->
    <el-dialog v-model="registerCodeDialogVisible" title="修改注册码" width="400px" center destroy-on-close
      custom-class="elegant-dialog">
      <div class="dialog-icon">
        <div class="icon-circle">
          <el-icon :size="32">
            <Ticket />
          </el-icon>
        </div>
      </div>
      <el-form ref="registerCodeFormRef" :model="registerCodeForm" label-position="top" class="elegant-form">
        <el-form-item label="当前注册码" prop="oldCode">
          <el-input v-model="registerCodeForm.oldCode" placeholder="请输入当前注册码" class="elegant-input">
            <template #prefix>
              <el-icon>
                <Ticket />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="新注册码" prop="newCode">
          <el-input v-model="registerCodeForm.newCode" placeholder="请输入新注册码" class="elegant-input">
            <template #prefix>
              <el-icon>
                <Ticket />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="registerCodeDialogVisible = false" plain class="cancel-btn">取消</el-button>
          <el-button type="primary" @click="submitRegisterCodeChange" :loading="loading"
            class="primary-gradient confirm-btn">确认修改</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog v-model="resetPasswordDialogVisible" title="重置用户密码" width="400px" center destroy-on-close
      custom-class="elegant-dialog">
      <div class="dialog-icon">
        <div class="icon-circle danger">
          <el-icon :size="32">
            <Key />
          </el-icon>
        </div>
      </div>
      <el-alert title="此操作将直接重置用户密码，无需验证旧密码" type="warning" :closable="false" show-icon class="elegant-alert" />
      <el-form ref="resetPasswordFormRef" :model="resetPasswordForm" :rules="resetPasswordRules" label-position="top"
        class="elegant-form">
        <el-form-item label="用户名">
          <el-input v-model="resetPasswordForm.username" disabled class="elegant-input">
            <template #prefix>
              <el-icon>
                <User />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="resetPasswordForm.newPassword" type="password" placeholder="请输入新密码" show-password
            class="elegant-input">
            <template #prefix>
              <el-icon>
                <Lock />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="resetPasswordForm.confirmPassword" type="password" placeholder="请再次输入新密码" show-password
            class="elegant-input">
            <template #prefix>
              <el-icon>
                <Check />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="resetPasswordDialogVisible = false" plain class="cancel-btn">取消</el-button>
          <el-button type="danger" @click="submitResetPassword" :loading="loading"
            class="danger-gradient confirm-btn">确认重置</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 修改昵称对话框 -->
    <el-dialog v-model="nicknameDialogVisible" title="修改昵称" width="400px" center destroy-on-close
      custom-class="elegant-dialog">
      <div class="dialog-icon">
        <div class="icon-circle">
          <el-icon :size="32">
            <Edit />
          </el-icon>
        </div>
      </div>
      <el-form ref="nicknameFormRef" :model="nicknameForm" :rules="nicknameRules" label-position="top"
        class="elegant-form">
        <el-form-item label="用户名">
          <el-input v-model="nicknameForm.username" disabled class="elegant-input">
            <template #prefix>
              <el-icon>
                <User />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="nicknameForm.nickname" placeholder="请输入昵称" class="elegant-input">
            <template #prefix>
              <el-icon>
                <Edit />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="nicknameDialogVisible = false" plain class="cancel-btn">取消</el-button>
          <el-button type="primary" @click="submitNicknameChange" :loading="loading"
            class="primary-gradient confirm-btn">确认修改</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* 主题颜色变量 - 浅色主题 */
.admin-container {
  --transition-time: 0.3s;
  /* 添加过渡时间变量 */
  --bg-color: #f8fafc;
  --sidebar-bg: #ffffff;
  --sidebar-active-bg: #f1f5f9;
  --header-bg: #ffffff;
  --text-color: #334155;
  --text-light: #64748b;
  --text-sidebar: #64748b;
  --text-active: #0ea5e9;
  --border-color: #e2e8f0;
  --card-bg: #ffffff;
  --hover-bg: #f1f5f9;
  --btn-primary: #0ea5e9;
  --btn-primary-hover: #0284c7;

  /* 新增变量 */
  --header-bg-color: #f8fafc;
  --header-text-color: #334155;
  --even-row-bg: #ffffff;
  --odd-row-bg: #f9fafb;
}

/* 深色主题 */
.admin-container.dark-theme {
  --bg-color: #0f172a;
  --sidebar-bg: #1e293b;
  --sidebar-active-bg: #334155;
  --header-bg: #1e293b;
  --text-color: #f1f5f9;
  --text-light: #94a3b8;
  --text-sidebar: #94a3b8;
  --text-active: #38bdf8;
  --border-color: #334155;
  --card-bg: #1e293b;
  --hover-bg: #334155;
  --btn-primary: #0ea5e9;
  --btn-primary-hover: #0284c7;

  /* 新增变量 */
  --header-bg-color: #1e293b;
  --header-text-color: #f1f5f9;
  --even-row-bg: #1e293b;
  --odd-row-bg: #1e2b3a;
}

.admin-container {
  display: flex;
  min-height: 100vh;
  background-color: var(--bg-color);
  color: var(--text-color);
  transition: background-color var(--transition-time);
}

/* 左侧导航样式 */
.admin-sidebar {
  width: 220px;
  height: 100vh;
  background-color: var(--sidebar-bg);
  box-shadow: var(--shadow);
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1000;
  transition: width var(--transition-time), background-color var(--transition-time);
  display: flex;
  flex-direction: column;
}

.admin-sidebar.collapsed {
  width: 64px;
}

.admin-logo {
  height: 60px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  background-color: var(--sidebar-bg);
  border-bottom: 1px solid var(--border-color);
  transition: background-color var(--transition-time);
}

.admin-logo img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  margin-right: 12px;
}

.admin-logo span {
  color: var(--text-color);
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  transition: color var(--transition-time);
}

.admin-menu {
  flex: 1;
  border-right: none;
  background-color: var(--sidebar-bg);
  transition: background-color var(--transition-time);
}

/* Element Plus 菜单样式覆盖 */
.admin-menu :deep(.el-menu) {
  background-color: var(--sidebar-bg) !important;
  border-right: none;
}

.admin-menu :deep(.el-menu-item) {
  color: var(--text-sidebar) !important;
  background-color: var(--sidebar-bg) !important;
  height: 50px;
  transition: color var(--transition-time), background-color var(--transition-time);
}

.admin-menu :deep(.el-menu-item:hover),
.admin-menu :deep(.el-menu-item:focus) {
  background-color: var(--sidebar-active-bg) !important;
  color: var(--text-active) !important;
}

.admin-menu :deep(.el-menu-item.is-active) {
  color: var(--text-active) !important;
  background-color: var(--sidebar-active-bg) !important;
}

/* 收缩按钮 */
.sidebar-toggle {
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  border-top: 1px solid var(--border-color);
  color: var(--text-sidebar);
  transition: background-color var(--transition-time), color var(--transition-time);
}

.sidebar-toggle:hover {
  background-color: var(--hover-bg);
}

/* 右侧内容样式 */
.admin-content {
  flex: 1;
  margin-left: 220px;
  transition: margin-left var(--transition-time);
}

.admin-content.expanded {
  margin-left: 64px;
}

/* 顶部导航样式 */
.admin-header {
  height: 60px;
  background-color: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 10;
  transition: background-color var(--transition-time), border-bottom var(--transition-time);
}

.header-left h2 {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-color);
  margin: 0;
  transition: color var(--transition-time);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 主题切换按钮 */
.theme-switch {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-light);
  transition: background-color var(--transition-time), color var(--transition-time);
}

.theme-switch:hover {
  background-color: var(--hover-bg);
  color: var(--text-active);
}

.search-box {
  width: 220px;
}

.search-input :deep(.el-input__wrapper) {
  background-color: var(--bg-color);
  box-shadow: 0 0 0 1px var(--border-color) inset;
  border-radius: 6px;
  transition: background-color var(--transition-time), box-shadow var(--transition-time);
}

.search-input :deep(.el-input__wrapper):hover {
  box-shadow: 0 0 0 1px var(--text-light) inset;
}

.search-input :deep(.el-input__inner) {
  color: var(--text-color);
  transition: color var(--transition-time);
}

.search-input :deep(.el-input__inner::placeholder) {
  color: var(--text-light);
}

.search-icon {
  color: var(--text-light);
  transition: color var(--transition-time);
}

/* 用户信息样式 */
.user-profile {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 6px;
  transition: background-color var(--transition-time);
}

.user-profile:hover {
  background-color: var(--hover-bg);
}

.user-name {
  font-size: 14px;
  color: var(--text-color);
  transition: color var(--transition-time);
}

/* 主要内容区域样式 */
.admin-main {
  padding: 20px;
}

/* 仪表盘头部样式 */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.dashboard-title h3 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 4px 0;
}

.subtitle {
  color: var(--text-light);
  font-size: 14px;
  margin: 0;
}

.dashboard-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-container {
  width: 280px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 卡片样式增强 */
.data-card {
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.data-card:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.header-actions {
  display: flex;
  gap: 8px;
}

/* 表格单元格样式 */
.username-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.username-text {
  font-weight: 500;
}

.time-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.time-detail {
  color: var(--text-light);
  font-size: 12px;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 8px;
}

/* 展开详情样式 */
.user-detail {
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  background-color: var(--hover-bg);
  border-radius: 8px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  color: var(--text-light);
  font-size: 12px;
}

.value {
  font-weight: 500;
}

/* 对话框样式 */
:deep(.custom-dialog) {
  border-radius: 16px;
  overflow: hidden;
}

:deep(.custom-dialog .el-dialog__header) {
  padding: 20px 20px 10px;
  text-align: center;
  margin-right: 0;
}

:deep(.custom-dialog .el-dialog__body) {
  padding: 10px 30px 20px;
}

:deep(.custom-dialog .el-dialog__footer) {
  padding: 10px 30px 20px;
  border-top: 1px solid var(--border-color);
}

.dialog-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.dialog-icon-inner {
  padding: 16px;
  border-radius: 50%;
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.dialog-footer {
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 16px;
}

/* 空状态模块样式 */
.empty-module {
  display: flex;
  justify-content: center;
  align-items: center;
  height: calc(100vh - 120px);
}

.empty-icon {
  color: var(--text-light);
}

.empty-text {
  color: var(--text-light);
  margin-top: 8px;
  font-size: 16px;
}

/* 响应式调整 */
@media screen and (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .dashboard-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .search-container {
    width: 100%;
  }
}

/* 新增样式 */
.fade-in {
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 统计卡片 */
.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color);
}

.stat-label {
  font-size: 14px;
  color: var(--text-light);
}

/* 表格样式增强 */
.elegant-table {
  border-radius: 8px;
  overflow: hidden;
}

.even-row {
  background-color: var(--even-row-bg);
}

.odd-row {
  background-color: var(--odd-row-bg);
}

.id-badge {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border-radius: 12px;
  padding: 4px 8px;
  font-weight: 600;
  font-size: 12px;
  display: inline-block;
}

/* 用户单元格样式 */
.avatar-wrapper {
  position: relative;
  margin-right: 12px;
}

.user-avatar {
  border: 2px solid var(--el-color-primary-light-8);
}

.status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid #fff;
}

.status-online {
  background-color: #10b981;
}

.status-away {
  background-color: #f59e0b;
}

.status-offline {
  background-color: #6b7280;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.username-text {
  font-weight: 600;
  color: var(--text-color);
}

.user-subtitle {
  font-size: 12px;
  color: var(--text-light);
}

/* 时间单元格样式 */
.time-cell {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
}

.time-icon {
  color: var(--text-light);
  background-color: var(--el-color-primary-light-9);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.time-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.time-main {
  font-weight: 500;
  color: var(--text-color);
}

.time-detail {
  font-size: 12px;
  color: var(--text-light);
}

/* 操作按钮样式 */
.action-button {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 详情展开样式 */
.detail-section {
  background-color: var(--card-bg);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.detail-header {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  padding: 10px 16px;
  font-weight: 600;
  font-size: 14px;
}

.detail-content {
  padding: 16px;
}

.detail-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.detail-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.detail-info {
  display: flex;
  flex-direction: column;
}

.detail-timeline {
  padding: 8px 0;
}

.timeline-item {
  position: relative;
  padding-left: 24px;
  padding-bottom: 16px;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-dot {
  position: absolute;
  left: 0;
  top: 6px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: var(--el-color-primary);
}

.timeline-item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 18px;
  bottom: 0;
  width: 2px;
  background-color: var(--border-color);
}

.timeline-content {
  padding-bottom: 8px;
}

.timeline-title {
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 4px;
}

.timeline-time {
  font-size: 12px;
  color: var(--text-light);
}

/* 空状态样式 */
.table-empty {
  padding: 40px 0;
}

.empty-illustration {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 8px;
}

.empty-text {
  color: var(--text-light);
  margin: 0 0 16px;
}

/* 对话框样式 */
:deep(.elegant-dialog) {
  border-radius: 16px;
  overflow: hidden;
}

:deep(.elegant-dialog .el-dialog__header) {
  padding: 20px 20px 10px;
  text-align: center;
  margin-right: 0;
  font-size: 18px;
  font-weight: 600;
}

:deep(.elegant-dialog .el-dialog__body) {
  padding: 10px 30px 20px;
}

:deep(.elegant-dialog .el-dialog__footer) {
  padding: 10px 30px 20px;
  border-top: 1px solid var(--border-color);
}

.icon-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-circle.danger {
  background-color: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}

.elegant-form .el-form-item__label {
  font-weight: 500;
}

.elegant-input {
  --el-input-border-radius: 8px;
}

.elegant-alert {
  margin-bottom: 20px;
  border-radius: 8px;
}

/* 按钮样式 */
.primary-gradient {
  background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-light-3));
  border: none;
}

.danger-gradient {
  background: linear-gradient(135deg, var(--el-color-danger), var(--el-color-danger-light-3));
  border: none;
}

.confirm-btn {
  min-width: 120px;
}

.cancel-btn {
  min-width: 80px;
}

/* 响应式调整 */
@media screen and (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .dashboard-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .search-container {
    width: 100%;
  }

  .dashboard-stats {
    grid-template-columns: 1fr;
  }
}

/* 昵称单元格样式 */
.nickname-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.nickname-text {
  font-size: 14px;
  color: var(--text-color);
  transition: color var(--transition-time);
}

.edit-btn {
  opacity: 0;
  transition: opacity var(--transition-time);
}

.nickname-cell:hover .edit-btn {
  opacity: 1;
}
</style>