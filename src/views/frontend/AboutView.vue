<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getProfile } from '../../api/profile'
import type { Profile, WorkExhibitionItem } from '../../api/profile'
import { parseWorkExhibition } from '../../api/profile'
import { ElMessage, ElSkeleton, ElSkeletonItem, ElEmpty } from 'element-plus'
import { Message, Phone, User } from '@element-plus/icons-vue'
import FrontendNav from '../../components/FrontendNav.vue'

// 个人信息数据
const profile = ref<Profile | null>(null)
const workExhibition = ref<WorkExhibitionItem[]>([])
const loading = ref(true)
const notFound = ref(false)

// 获取个人信息
const fetchProfile = async () => {
  loading.value = true
  try {
    const response = await getProfile()
    console.log('Profile response:', response)
    
    // 处理响应数据
    if (response && typeof response === 'object') {
      let profileData = null
      
      if ('data' in response && response.data) {
        profileData = response.data
      } else if (!('data' in response)) {
        profileData = response
      }
      
      if (profileData) {
        profile.value = profileData
        
        // 解析作品展示
        if (profileData.work_exhibition) {
          workExhibition.value = parseWorkExhibition(profileData.work_exhibition)
          console.log('Parsed work exhibition:', workExhibition.value)
        }
        
        // 设置页面标题
        document.title = profileData.name ? `关于 ${profileData.name}` : '关于我'
      } else {
        notFound.value = true
      }
    } else {
      notFound.value = true
    }
  } catch (error) {
    console.error('获取个人信息失败:', error)
    ElMessage.warning('获取个人信息失败，请稍后再试')
    notFound.value = true
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(() => {
  fetchProfile()
})
</script>

<template>
  <div>
    <FrontendNav />
    <div class="about-container">
      <!-- 页面标题 -->
      <div class="about-header">
        <h1 class="about-title">关于我</h1>
        <div class="title-line"></div>
      </div>
      
      <!-- 个人信息内容 -->
      <div v-if="!loading && profile && !notFound" class="profile-content">
        <!-- 个人基本信息 -->
        <section class="profile-section">
          <div class="profile-card">
            <div class="profile-info">
              <h2 class="profile-name">{{ profile.name }}</h2>
              <div class="profile-contact">
                <div class="contact-item">
                  <el-icon><Message /></el-icon>
                  <span class="contact-label">邮箱：</span>
                  <a :href="`mailto:${profile.email}`" class="contact-value">{{ profile.email }}</a>
                </div>
                <div class="contact-item">
                  <el-icon><Phone /></el-icon>
                  <span class="contact-label">微信：</span>
                  <span class="contact-value">{{ profile.weixin }}</span>
                </div>
              </div>
              <div class="profile-description">
                <p>{{ profile.desc_per }}</p>
              </div>
            </div>
          </div>
        </section>
        
        <!-- 作品展示 -->
        <section class="works-section" v-if="workExhibition.length > 0">
          <h2 class="section-title">作品展示</h2>
          <div class="works-grid">
            <div v-for="(work, index) in workExhibition" :key="index" class="work-card">
              <div class="work-image">
                <img :src="work.image" :alt="`作品 ${index + 1}`" />
              </div>
              <div class="work-description">
                <p>{{ work.description }}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
      
      <!-- 无数据状态 -->
      <div v-else-if="!loading && notFound" class="profile-not-found">
        <el-empty description="暂无个人信息" :image-size="200">
          <template #description>
            <p>管理员尚未设置个人信息</p>
          </template>
        </el-empty>
      </div>
      
      <!-- 加载骨架屏 -->
      <div v-else class="profile-skeleton">
        <el-skeleton animated :rows="6" :loading="loading">
          <template #template>
            <div style="padding: 20px;">
              <el-skeleton-item variant="h1" style="width: 40%; margin: 0 auto 40px;" />
              <div style="width: 100%; max-width: 800px; margin: 0 auto;">
                <el-skeleton-item variant="h3" style="width: 30%; margin-bottom: 20px;" />
                <el-skeleton-item variant="text" style="width: 60%; margin-bottom: 10px;" />
                <el-skeleton-item variant="text" style="width: 60%; margin-bottom: 20px;" />
                <el-skeleton-item variant="p" style="width: 100%; margin-bottom: 20px;" />
                <el-skeleton-item variant="p" style="width: 100%; margin-bottom: 20px;" />
                <el-skeleton-item variant="p" style="width: 80%; margin-bottom: 40px;" />
                
                <el-skeleton-item variant="h3" style="width: 30%; margin: 30px 0 20px;" />
                <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                  <div style="width: 32%;">
                    <el-skeleton-item variant="image" style="width: 100%; height: 200px;" />
                    <el-skeleton-item variant="p" style="width: 100%; margin-top: 10px;" />
                  </div>
                  <div style="width: 32%;">
                    <el-skeleton-item variant="image" style="width: 100%; height: 200px;" />
                    <el-skeleton-item variant="p" style="width: 100%; margin-top: 10px;" />
                  </div>
                  <div style="width: 32%;">
                    <el-skeleton-item variant="image" style="width: 100%; height: 200px;" />
                    <el-skeleton-item variant="p" style="width: 100%; margin-top: 10px;" />
                  </div>
                </div>
              </div>
            </div>
          </template>
        </el-skeleton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.about-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 60px 20px;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  color: #333;
}

.about-header {
  text-align: center;
  margin-bottom: 60px;
  animation: fadeIn 1s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.about-title {
  font-size: 3rem;
  font-weight: 300;
  letter-spacing: 2px;
  margin-bottom: 15px;
  color: #1a2a6c;
}

.title-line {
  width: 60px;
  height: 3px;
  background-color: #1a2a6c;
  margin: 0 auto;
  transition: width 0.5s ease;
}

.about-header:hover .title-line {
  width: 100px;
}

.profile-content {
  max-width: 900px;
  margin: 0 auto;
  animation: fadeIn 1s ease 0.3s both;
}

.profile-section {
  margin-bottom: 60px;
}

.profile-card {
  background-color: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.profile-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 5px;
  background: linear-gradient(90deg, #1a2a6c, #b21f1f, #fdbb2d);
}

.profile-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.1);
}

.profile-name {
  font-size: 2.5rem;
  font-weight: 600;
  margin-bottom: 20px;
  letter-spacing: -0.5px;
  color: #1a2a6c;
}

.profile-contact {
  margin-bottom: 30px;
}

.contact-item {
  margin-bottom: 15px;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
}

.contact-item .el-icon {
  margin-right: 10px;
  color: #1a2a6c;
}

.contact-label {
  font-weight: 500;
  color: #666;
  margin-right: 10px;
}

.contact-value {
  color: #333;
}

a.contact-value {
  color: #1a2a6c;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: all 0.3s ease;
}

a.contact-value:hover {
  border-bottom-color: #1a2a6c;
}

.profile-description {
  font-size: 1.1rem;
  line-height: 1.8;
  color: #444;
  position: relative;
  padding-left: 20px;
  border-left: 3px solid #f0f0f0;
}

.profile-description p {
  margin-bottom: 15px;
}

.section-title {
  font-size: 2rem;
  font-weight: 300;
  margin-bottom: 30px;
  letter-spacing: 1px;
  text-align: center;
  color: #1a2a6c;
}

.works-section {
  margin-top: 80px;
  animation: fadeIn 1s ease 0.6s both;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 30px;
}

.work-card {
  background-color: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.work-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
}

.work-image {
  height: 250px;
  overflow: hidden;
}

.work-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.5s ease;
}

.work-card:hover .work-image img {
  transform: scale(1.05);
}

.work-description {
  padding: 25px;
  background-color: white;
}

.work-description p {
  font-size: 1rem;
  line-height: 1.6;
  color: #555;
}

.profile-not-found {
  text-align: center;
  padding: 60px 0;
}

/* 响应式样式 */
@media (max-width: 768px) {
  .about-container {
    padding: 40px 20px;
  }
  
  .about-title {
    font-size: 2.5rem;
  }
  
  .profile-card {
    padding: 30px 20px;
  }
  
  .profile-name {
    font-size: 2rem;
  }
  
  .works-grid {
    grid-template-columns: 1fr;
  }
}
</style>
