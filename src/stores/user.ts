import { defineStore } from 'pinia'
import { ref } from 'vue'
import router from '../router'
import * as userApi from '../api/user'
import { ElMessage } from 'element-plus'

// 用户信息接口
interface UserInfo {
  username: string
  nickname: string
  role: string
}

// 默认用户信息
const defaultUserInfo = (): UserInfo => ({
  username: '',
  nickname: '',
  role: ''
})

// 用户状态存储
export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref(localStorage.getItem('token') || '')
  const username = ref(localStorage.getItem('username') || '')
  const nickname = ref(localStorage.getItem('nickname') || '')
  const isLoading = ref(false)
  const errorMessage = ref('')
  const isLoggedIn = ref(!!token.value)
  const userInfo = ref<UserInfo>(defaultUserInfo())

  // 获取认证状态
  const isAuthenticated = () => !!token.value
  
  // 获取用户信息
  const getUserInfo = async (): Promise<boolean> => {
    if (!token.value) return false
    
    isLoading.value = true
    try {
      const response = await userApi.getUserInfo()
      
      if (response && response.data) {
        userInfo.value = {
          username: response.data.username || '',
          nickname: response.data.nickname || '',
          role: response.data.role || ''
        }
        
        // 更新本地存储
        username.value = userInfo.value.username
        nickname.value = userInfo.value.nickname
        localStorage.setItem('username', userInfo.value.username)
        if (userInfo.value.nickname) {
          localStorage.setItem('nickname', userInfo.value.nickname)
        }
        
        return true
      }
      return false
    } catch (error) {
      ElMessage.error('获取用户信息失败')
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  // 注册用户
  const register = async (userData: { username: string, password: string, code: string, nickname?: string }) => {
    isLoading.value = true
    errorMessage.value = ''
    
    try {
      const response = await userApi.register({
        username: userData.username,
        nickname: userData.nickname || '',
        password: userData.password,
        code: userData.code
      })
      
      return { success: true, message: '注册成功' }
    } catch (error: any) {
      errorMessage.value = error.message || '注册过程中出现错误'
      return { success: false, message: errorMessage.value }
    } finally {
      isLoading.value = false
    }
  }
  
  // 登录用户
  const login = async (userData: { username: string, password: string }): Promise<{ success: boolean, message: string }> => {
    isLoading.value = true
    try {
      console.log('开始登录请求:', userData.username)
      const response = await userApi.login({ 
        username: userData.username, 
        password: userData.password 
      })
      
      console.log('登录响应数据:', response)
      
      if (!response) {
        throw new Error('登录失败: 服务器未返回数据')
      }
      
      // 处理不同的API响应格式
      let tokenValue: string | null = null
      
      // 如果是直接返回token字符串
      if (typeof response === 'string') {
        tokenValue = response
      }
      // 如果返回是对象
      else if (typeof response === 'object') {
        if ('token' in response) {
          // {token: '...'} 格式
          tokenValue = response.token as string
        } else if ('data' in response && response.data && typeof response.data === 'object' && 'token' in response.data) {
          // {data: {token: '...'}} 格式
          tokenValue = response.data.token as string
        }
      }
      
      if (!tokenValue) {
        console.error('未找到token，响应数据:', response)
        throw new Error('登录失败: 未获取到有效token')
      }
      
      console.log('成功获取token')
      
      // 保存token到localStorage
      localStorage.setItem('token', tokenValue)
      localStorage.setItem('username', userData.username)
      
      // 更新状态
      token.value = tokenValue
      username.value = userData.username
      isLoggedIn.value = true
      
      // 尝试获取用户信息
      try {
        await getUserInfo()
      } catch (userInfoError) {
        console.warn('获取用户信息失败，但登录成功:', userInfoError)
      }
      
      return { success: true, message: '登录成功' }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '登录失败，请检查用户名和密码'
      console.error('登录错误:', errorMsg, error)
      return { success: false, message: errorMsg }
    } finally {
      isLoading.value = false
    }
  }
  
  // 退出登录
  const logout = async (): Promise<boolean> => {
    isLoading.value = true
    try {
      await userApi.logout()
      
      // 清除状态
      token.value = ''
      username.value = ''
      nickname.value = ''
      isLoggedIn.value = false
      userInfo.value = defaultUserInfo()
      
      // 清除localStorage
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      localStorage.removeItem('nickname')
      
      return true
    } catch (error) {
      // 即使API调用失败，也清除本地状态
      token.value = ''
      username.value = ''
      nickname.value = ''
      isLoggedIn.value = false
      userInfo.value = defaultUserInfo()
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      localStorage.removeItem('nickname')
      
      return false
    } finally {
      isLoading.value = false
    }
  }
  
  return {
    token,
    username,
    nickname,
    isLoading,
    errorMessage,
    isAuthenticated,
    userInfo,
    isLoggedIn,
    getUserInfo,
    register,
    login,
    logout
  }
}) 