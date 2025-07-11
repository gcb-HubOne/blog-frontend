<script lang="ts" setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '../../stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const activeTab = ref('login')
const loginFormRef = ref<FormInstance>()
const registerFormRef = ref<FormInstance>()
const isLoading = ref(false)

// 检查是否有登录后的重定向地址
onMounted(() => {
  // 如果有重定向路径，显示提示信息
  if (route.query.redirect) {
    ElMessage.info('请先登录')
  }
})

// 切换登录/注册标签
const switchTab = (tab: string) => {
  activeTab.value = tab
}

// 登录表单
const loginForm = reactive({
  username: '',
  password: '',
  remember: false
})

// 登录表单验证规则
const loginRules = reactive<FormRules>({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 30, message: '用户名长度在2到30个字符之间', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在6到20个字符之间', trigger: 'blur' }
  ]
})

// 登录提交
const submitLoginForm = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  
  await formEl.validate(async (valid) => {
    if (valid) {
      isLoading.value = true
      console.log('提交登录表单:', loginForm)
      
      try {
        const result = await userStore.login({
          username: loginForm.username,
          password: loginForm.password
        })
        
        if (result.success) {
          ElMessage.success('登录成功')
          
          // 使用window.location.href直接重定向
          setTimeout(() => {
            window.location.href = '/admin'
          }, 500) // 延迟500ms以确保消息显示
        } else {
          ElMessage.error(result.message || '登录失败，请检查用户名和密码')
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '登录过程中发生错误'
        ElMessage.error(errorMsg)
        console.error('登录错误:', error)
      } finally {
        isLoading.value = false
      }
    }
  })
}

// 注册表单
const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  registerCode: ''
})

// 注册表单验证规则
const validateUsername = (rule: any, value: any, callback: any) => {
  if (!value) {
    return callback(new Error('请输入用户名'))
  }
  // 判断是否为全汉字
  const isAllChinese = /^[\u4e00-\u9fa5]+$/.test(value)
  // 判断是否为全字母
  const isAllLetter = /^[A-Za-z]+$/.test(value)
  if (isAllChinese) {
    if (value.length < 2) {
      return callback(new Error('用户名不能少于2个汉字'))
    }
    if (value.length > 10) {
      return callback(new Error('用户名不能大于10个汉字'))
    }
  } else if (isAllLetter) {
    if (value.length < 2) {
      return callback(new Error('用户名不能少于2个字母'))
    }
    if (value.length > 30) {
      return callback(new Error('用户名不能大于30个字母'))
    }
  } else {
    return callback(new Error('用户名只能为汉字或字母'))
  }
  callback()
}

const validatePass = (rule: any, value: any, callback: any) => {
  if (!value) {
    return callback(new Error('请输入密码'))
  }
  // 密码长度校验
  if (value.length < 6) {
    return callback(new Error('密码不能少于6位'))
  }
  if (value.length > 20) {
    return callback(new Error('密码不能超过20位'))
  }
  // 密码复杂度校验：必须包含字母和数字
  const hasLetter = /[A-Za-z]/.test(value)
  const hasNumber = /\d/.test(value)
  if (!hasLetter || !hasNumber) {
    return callback(new Error('密码必须包含字母和数字'))
  }
  // 如果确认密码有值，触发确认密码校验
  if (registerForm.confirmPassword !== '') {
    if (registerFormRef.value) {
      registerFormRef.value.validateField('confirmPassword')
    }
  }
  callback()
}

const validatePass2 = (rule: any, value: any, callback: any) => {
  if (value === '') {
    return callback(new Error('请再次输入密码'))
  }
  if (value !== registerForm.password) {
    return callback(new Error('两次输入的密码不一致'))
  }
  callback()
}

const validateRegisterCode = (rule: any, value: any, callback: any) => {
  if (value === '') {
    callback(new Error('请输入注册码'))
  } else {
    callback()
  }
}

const registerRules = reactive<FormRules>({
  username: [{ validator: validateUsername, trigger: 'blur' }],
  password: [{ validator: validatePass, trigger: 'blur' }],
  confirmPassword: [{ validator: validatePass2, trigger: 'blur' }],
  registerCode: [{ validator: validateRegisterCode, trigger: 'blur' }]
})

// 注册提交
const submitRegisterForm = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  
  await formEl.validate(async (valid) => {
    if (valid) {
      isLoading.value = true
      console.log('提交注册表单:', registerForm)
      
      try {
        const result = await userStore.register({
          username: registerForm.username,
          password: registerForm.password,
          code: registerForm.registerCode
        })
        
        if (result.success) {
          ElMessage.success('注册成功，请登录')
          activeTab.value = 'login' // 切换到登录标签
          resetForm(formEl) // 重置表单
        } else {
          ElMessage.error(result.message)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '注册过程中发生错误'
        ElMessage.error(errorMsg)
        console.error('注册错误:', error)
      } finally {
        isLoading.value = false
      }
    }
  })
}

// 重置表单
const resetForm = (formEl: FormInstance | undefined) => {
  if (!formEl) return
  formEl.resetFields()
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-box">
        <!-- 装饰元素 -->
        <div class="decoration-circle circle-1"></div>
        <div class="decoration-circle circle-2"></div>
        <div class="decoration-circle circle-3"></div>
        
        <!-- 切换标签 -->
        <div class="auth-tabs">
          <div 
            class="auth-tab" 
            :class="{ 'active': activeTab === 'login' }" 
            @click="switchTab('login')"
          >
            登录
          </div>
          <div 
            class="auth-tab" 
            :class="{ 'active': activeTab === 'register' }" 
            @click="switchTab('register')"
          >
            注册
          </div>
        </div>
        
        <!-- 标题 -->
        <div class="auth-header">
          <h2>{{ activeTab === 'login' ? '欢迎回来' : '创建账号' }}</h2>
          <p>{{ activeTab === 'login' ? '请登录您的账号' : '加入我们的平台' }}</p>
        </div>

        <!-- 登录表单 -->
        <div class="auth-form" v-if="activeTab === 'login'">
          <el-form 
            ref="loginFormRef" 
            :model="loginForm" 
            :rules="loginRules" 
            label-position="top"
          >
            <el-form-item label="用户名" prop="username">
              <el-input 
                v-model="loginForm.username" 
                placeholder="请输入用户名"
                prefix-icon="User"
              />
            </el-form-item>
            
            <el-form-item label="密码" prop="password">
              <el-input 
                v-model="loginForm.password" 
                type="password" 
                placeholder="请输入密码" 
                show-password
                prefix-icon="Lock"
              />
            </el-form-item>
            
            <el-form-item>
              <div class="remember-forgot">
                <el-checkbox v-model="loginForm.remember">记住我</el-checkbox>
                <a href="javascript:void(0)" class="forgot-link">忘记密码?</a>
              </div>
            </el-form-item>
            
            <el-form-item>
              <el-button 
                type="primary" 
                class="submit-btn" 
                @click="submitLoginForm(loginFormRef)"
                :loading="isLoading"
              >
                登录
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 注册表单 -->
        <div class="auth-form" v-else>
          <el-form 
            ref="registerFormRef" 
            :model="registerForm" 
            :rules="registerRules" 
            label-position="top"
          >
            <el-form-item label="用户名" prop="username">
              <el-input 
                v-model="registerForm.username" 
                placeholder="汉字或字母"
                prefix-icon="User"
              />
            </el-form-item>
            
            <el-form-item label="密码" prop="password">
              <el-input 
                v-model="registerForm.password" 
                type="password" 
                placeholder="包含字母和数字,6-20位" 
                show-password
                prefix-icon="Lock"
              />
            </el-form-item>
            
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input 
                v-model="registerForm.confirmPassword" 
                type="password" 
                placeholder="请再次输入密码" 
                show-password
                prefix-icon="Key"
              />
            </el-form-item>
            
            <el-form-item label="注册码" prop="registerCode">
              <el-input 
                v-model="registerForm.registerCode" 
                placeholder="请输入注册码"
                prefix-icon="Ticket"
              />
            </el-form-item>
            
            <el-form-item>
              <div class="btn-container">
                <el-button 
                  type="primary" 
                  @click="submitRegisterForm(registerFormRef)"
                  class="register-btn"
                  :loading="isLoading"
                >
                  注册
                </el-button>
                <el-button 
                  @click="resetForm(registerFormRef)"
                  class="register-reset-btn"
                >
                  重置
                </el-button>
              </div>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.auth-container {
  width: 100%;
  max-width: 460px;
  padding: 20px;
  position: relative;
  z-index: 1;
}

.auth-box {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  padding: 40px;
  box-shadow: 
    0 15px 35px rgba(50, 50, 93, 0.1),
    0 5px 15px rgba(0, 0, 0, 0.07),
    0 0 0 1px rgba(255, 255, 255, 0.15) inset;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.18);
}

/* 装饰圆圈 */
.decoration-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.1;
  z-index: -1;
}

.circle-1 {
  width: 150px;
  height: 150px;
  background: linear-gradient(135deg, #3498db, #9b59b6);
  top: -50px;
  left: -50px;
}

.circle-2 {
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #f1c40f, #e74c3c);
  bottom: 30px;
  right: -30px;
}

.circle-3 {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #2ecc71, #1abc9c);
  bottom: -20px;
  left: 30%;
}

/* 标签切换 */
.auth-tabs {
  display: flex;
  margin-bottom: 30px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.auth-tab {
  padding: 12px 20px;
  margin-right: 10px;
  font-size: 16px;
  font-weight: 500;
  color: #606266;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
}

.auth-tab.active {
  color: #409eff;
}

.auth-tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background: #409eff;
  border-radius: 2px;
}

.auth-header {
  text-align: center;
  margin-bottom: 24px;
}

.auth-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.auth-header p {
  font-size: 14px;
  color: #909399;
}

/* 表单样式 */
.auth-form {
  animation: fadeIn 0.5s ease;
}

.remember-forgot {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.forgot-link {
  color: #909399;
  font-size: 14px;
  text-decoration: none;
  transition: color 0.3s;
}

.forgot-link:hover {
  color: #409eff;
}

.submit-btn {
  width: 100%;
  padding: 12px 20px;
  font-size: 16px;
  border-radius: 8px;
  background: linear-gradient(135deg, #409eff, #3a8ee6);
  border: none;
  transition: transform 0.3s, box-shadow 0.3s;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 7px 14px rgba(50, 50, 93, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08);
}

/* 注册和重置按钮容器 */
.btn-container {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.register-btn {
  width: 48%;
  padding: 12px 20px;
  font-size: 16px;
  border-radius: 8px;
  background: linear-gradient(135deg, #409eff, #3a8ee6);
  border: none;
  transition: transform 0.3s, box-shadow 0.3s;
}

.register-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 7px 14px rgba(50, 50, 93, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08);
}

.register-reset-btn {
  width: 48%;
  border-radius: 8px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 响应式调整 */
@media (max-width: 576px) {
  .auth-container {
    padding: 10px;
  }
  
  .auth-box {
    padding: 30px 20px;
  }
}
</style>