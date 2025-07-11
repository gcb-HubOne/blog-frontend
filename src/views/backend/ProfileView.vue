<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { getProfile, createProfile, updateProfile, deleteProfile, parseWorkExhibition, stringifyWorkExhibition } from '../../api/profile'
import type { Profile, ProfileParams, WorkExhibitionItem } from '../../api/profile'
import { Delete, Plus, Picture } from '@element-plus/icons-vue'

// 加载状态和表单实例
const loading = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const profileExists = ref(false)
const dialogVisible = ref(false)

// 作品展示列表
const workExhibitionList = ref<WorkExhibitionItem[]>([])

// 表单数据
const form = reactive<ProfileParams>({
  name: '',
  email: '',
  weixin: '',
  desc_per: '',
  work_exhibition: ''
})

// 表单验证规则
const rules = reactive<FormRules>({
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在2到20个字符之间', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  weixin: [
    { required: true, message: '请输入微信号', trigger: 'blur' }
  ],
  desc_per: [
    { required: true, message: '请输入个人描述', trigger: 'blur' }
  ]
})

// 格式化日期时间
const formatDateTime = (dateTimeStr: string | undefined): string => {
  if (!dateTimeStr) return '未知时间';
  
  try {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    return dateTimeStr;
  }
}

// 获取个人信息
const getProfileData = async () => {
  loading.value = true
  
  try {

    
    const response = await getProfile()

    
    
    if (response && typeof response === 'object') {
      // 处理不同格式的响应
      const profileData = 'data' in response && response.data ? response.data : response
      
      if (profileData) {
        form.name = profileData.name || ''
        form.email = profileData.email || ''
        form.weixin = profileData.weixin || ''
        form.desc_per = profileData.desc_per || ''
        form.work_exhibition = profileData.work_exhibition || ''
        
        // 解析作品展示字符串为数组
        workExhibitionList.value = parseWorkExhibition(profileData.work_exhibition)
        profileExists.value = true
        
        // 显示创建/更新时间信息
        if (profileData.createAt) {
          ElMessage.info(`个人信息创建于: ${formatDateTime(profileData.createAt)}`)
        }
      }
    } else {
      ElMessage.warning('未找到个人信息')
      profileExists.value = false
    }
  } catch (error) {

    
    ElMessage.warning('个人信息不存在，请创建')
    profileExists.value = false
    // 初始化一个空的作品展示项
    if (workExhibitionList.value.length === 0) {
      workExhibitionList.value.push({ image: '', description: '' })
    }
  } finally {
    loading.value = false
  }
}

// 添加作品展示项
const addWorkExhibition = () => {
  workExhibitionList.value.push({ image: '', description: '' })
}

// 删除作品展示项
const removeWorkExhibition = (index: number) => {
  workExhibitionList.value.splice(index, 1)
}

// 更新表单中的work_exhibition字段
const updateWorkExhibition = () => {
  form.work_exhibition = stringifyWorkExhibition(workExhibitionList.value)
}

// 验证作品展示是否有效
const validateWorkExhibition = (): boolean => {
  // 确保至少有一项有效的作品展示
  const validItems = workExhibitionList.value.filter(item => 
    item.image.trim() !== '' && item.description.trim() !== ''
  )
  
  if (validItems.length === 0) {
    ElMessage.warning('请至少添加一项有效的作品展示（包含图片链接和描述）')
    return false
  }
  
  return true
}

// 提交表单
const submitForm = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  
  await formEl.validate(async (valid) => {
    if (valid) {
      // 验证作品展示
      if (!validateWorkExhibition()) {
        return
      }
      
      submitting.value = true
      
      try {
        // 更新作品展示字符串
        updateWorkExhibition()
 
        
        
        if (profileExists.value) {
          // 更新个人信息
  
          
          const updateResponse = await updateProfile(form)

          
          ElMessage.success('个人信息更新成功')
          dialogVisible.value = false
        } else {
          // 创建个人信息

          
          const createResponse = await createProfile(form)
    
          
          ElMessage.success('个人信息创建成功')
          profileExists.value = true
          dialogVisible.value = false
        }
        
        // 刷新数据
        await getProfileData()
      } catch (error) {

        
        ElMessage.error('保存个人信息失败，请检查网络连接或稍后再试')
      } finally {
        submitting.value = false
      }
    } else {
      ElMessage.warning('请正确填写所有必填项')
    }
  })
}

// 删除个人信息
const handleDeleteProfile = () => {
  ElMessageBox.confirm('确定要删除个人信息吗？此操作不可恢复！', '警告', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    loading.value = true
    
    try {
      await deleteProfile()
      ElMessage.success('个人信息删除成功')
      profileExists.value = false
      
      // 重置表单
      form.name = ''
      form.email = ''
      form.weixin = ''
      form.desc_per = ''
      form.work_exhibition = ''
      workExhibitionList.value = [{ image: '', description: '' }]
      
      if (formRef.value) {
        formRef.value.resetFields()
      }
    } catch (error) {
   
      
      ElMessage.error('删除个人信息失败，请检查网络连接或稍后再试')
    } finally {
      loading.value = false
    }
  }).catch(() => {

    
  })
}

// 重置表单
const resetForm = (formEl: FormInstance | undefined) => {
  if (!formEl) return
  
  ElMessageBox.confirm('确定要重置表单吗？所有未保存的更改将丢失', '提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    formEl.resetFields()
    
    // 重新获取个人信息
    getProfileData()
  }).catch(() => {
    // 取消重置
  })
}

// 初始化
onMounted(() => {
  getProfileData()
})
</script>

<template>
  <div class="profile-management">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>个人设置</span>
          <div class="action-buttons" v-if="profileExists">
            <el-button type="danger" @click="handleDeleteProfile" :loading="loading">
              <el-icon><Delete /></el-icon> 删除个人信息
            </el-button>
          </div>
        </div>
      </template>
      
      <div class="profile-content" v-loading="loading">
        <el-empty v-if="!profileExists && !loading" description="未找到个人信息，请创建" class="initial-state">
          <template #description>
            <p>未找到个人信息，请点击下方按钮创建</p>
          </template>
          <el-button type="primary" @click="dialogVisible = true">
            <el-icon><Plus /></el-icon> 创建个人信息
          </el-button>
        </el-empty>
        
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          class="profile-form"
          v-else
        >
          <el-row :gutter="20">
            <el-col :span="24" :md="12">
              <el-form-item label="姓名" prop="name">
                <el-input v-model="form.name" placeholder="请输入姓名" />
              </el-form-item>
            </el-col>
            
            <el-col :span="24" :md="12">
              <el-form-item label="邮箱" prop="email">
                <el-input v-model="form.email" placeholder="请输入邮箱" />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-form-item label="微信号" prop="weixin">
            <el-input v-model="form.weixin" placeholder="请输入微信号" />
          </el-form-item>
          
          <el-form-item label="个人描述" prop="desc_per">
            <el-input
              v-model="form.desc_per"
              type="textarea"
              :rows="4"
              placeholder="请输入个人描述"
            />
          </el-form-item>
          
          <el-form-item label="作品展示">
            <div class="works-list">
              <transition-group name="work-item">
                <div v-for="(item, index) in workExhibitionList" :key="index" class="work-item">
                  <el-card shadow="hover" class="work-card">
                    <div class="work-header">
                      <span>作品 #{{ index + 1 }}</span>
                      <el-button
                        type="danger"
                        circle
                        size="small"
                        @click="removeWorkExhibition(index)"
                        class="remove-btn"
                        :disabled="workExhibitionList.length <= 1"
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                    
                    <el-form-item label="图片链接">
                      <el-input v-model="item.image" placeholder="请输入图片链接" />
                      <div v-if="item.image" class="image-preview">
                        <el-image
                          :src="item.image"
                          fit="cover"
                          style="max-width: 100%; height: 120px"
                        >
                          <template #error>
                            <div class="image-error">
                              <el-icon><Picture /></el-icon>
                              <span>图片预览失败</span>
                            </div>
                          </template>
                        </el-image>
                      </div>
                    </el-form-item>
                    
                    <el-form-item label="作品描述">
                      <el-input
                        v-model="item.description"
                        type="textarea"
                        :rows="2"
                        placeholder="请输入作品描述"
                      />
                    </el-form-item>
                  </el-card>
                </div>
              </transition-group>
              
              <div class="add-work">
                <el-button plain class="add-btn dashed-btn" @click="addWorkExhibition">
                  <el-icon><Plus /></el-icon> 添加作品
                </el-button>
              </div>
            </div>
          </el-form-item>
          
          <el-form-item>
            <div class="form-actions">
              <el-button type="primary" @click="submitForm(formRef)" :loading="submitting">
                {{ profileExists ? '更新信息' : '创建信息' }}
              </el-button>
              <el-button @click="resetForm(formRef)" :disabled="loading || submitting">重置</el-button>
            </div>
          </el-form-item>
        </el-form>
      </div>
    </el-card>
    
    <!-- 创建个人信息对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="创建个人信息"
      width="600px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        class="create-form"
      >
        <el-row :gutter="20">
          <el-col :span="24" :md="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="form.name" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          
          <el-col :span="24" :md="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="请输入邮箱" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="微信号" prop="weixin">
          <el-input v-model="form.weixin" placeholder="请输入微信号" />
        </el-form-item>
        
        <el-form-item label="个人描述" prop="desc_per">
          <el-input
            v-model="form.desc_per"
            type="textarea"
            :rows="4"
            placeholder="请输入个人描述"
          />
        </el-form-item>
        
        <!-- 作品展示 -->
        <el-form-item label="作品展示" required>
          <div class="works-list">
            <transition-group name="work-item">
              <div v-for="(item, index) in workExhibitionList" :key="'create-' + index" class="work-item">
                <el-card shadow="hover" class="work-card">
                  <div class="work-header">
                    <span>作品 #{{ index + 1 }}</span>
                    <el-button
                      type="danger"
                      circle
                      size="small"
                      @click="removeWorkExhibition(index)"
                      class="remove-btn"
                      :disabled="workExhibitionList.length <= 1"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                  <el-form-item label="图片链接">
                    <el-input v-model="item.image" placeholder="请输入图片链接" />
                    <div v-if="item.image" class="image-preview">
                      <el-image :src="item.image" fit="cover" style="max-width: 100%; height: 120px">
                        <template #error>
                          <div class="image-error">
                            <el-icon><Picture /></el-icon>
                            <span>图片预览失败</span>
                          </div>
                        </template>
                      </el-image>
                    </div>
                  </el-form-item>
                  <el-form-item label="作品描述">
                    <el-input v-model="item.description" type="textarea" :rows="2" placeholder="请输入作品描述" />
                  </el-form-item>
                </el-card>
              </div>
            </transition-group>
            <div class="add-work">
              <el-button plain class="add-btn dashed-btn" @click="addWorkExhibition">
                <el-icon><Plus /></el-icon> 添加作品
              </el-button>
            </div>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm(formRef)" :loading="submitting">创建</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.profile-management {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.profile-content {
  padding: 20px 0;
}

.profile-form {
  max-width: 900px;
  margin: 0 auto;
}

.initial-state {
  padding: 40px 0;
}

.works-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.work-item {
  transition: all 0.3s;
}

.work-item-enter-from,
.work-item-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.work-item-leave-active {
  position: absolute;
}

.work-card {
  border: 1px solid #ebeef5;
  transition: all 0.3s;
}

.work-card:hover {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.work-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
  font-weight: 500;
}

.image-preview {
  margin-top: 10px;
  border-radius: 4px;
  overflow: hidden;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 120px;
  background-color: #f5f7fa;
  color: #909399;
}

.add-work {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.add-btn {
  width: 100%;
}

.dashed-btn {
  border-style: dashed !important;
}

.form-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}

.action-buttons {
  display: flex;
  gap: 10px;
}
</style>
