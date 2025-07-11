<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getArticle } from '../../api/article'
import type { Article } from '../../api/article'
import { ElMessage, ElSkeleton, ElSkeletonItem } from 'element-plus'
import { ArrowLeft, Calendar, Collection } from '@element-plus/icons-vue'
import FrontendNav from '../../components/FrontendNav.vue'
import axios from 'axios'

// 路由
const route = useRoute()
const router = useRouter()

// 文章数据
const article = ref<Article | null>(null)
const loading = ref(true)
const articleId = ref(route.params.id as string)
const notFound = ref(false)
const articleContent = ref('')
const articleImage = ref('')

// 从localStorage获取文章数据
const getArticleFromLocalStorage = () => {
  try {
    const storedArticle = localStorage.getItem('currentArticle')
    if (storedArticle) {
      const parsedArticle = JSON.parse(storedArticle)
      
      // 检查是否是当前请求的文章
      if (parsedArticle.id === articleId.value) {
        console.log('从localStorage获取到文章数据:', parsedArticle)
        article.value = parsedArticle
        
        // 设置页面标题
        document.title = parsedArticle.title ? `${parsedArticle.title} - GCB-Blog` : 'GCB-Blog - 文章详情'
        return true
      }
    }
    return false
  } catch (error) {
    console.error('从localStorage获取文章数据失败:', error)
    return false
  }
}

// 直接获取文章详情
const fetchArticleDirectly = async () => {
  loading.value = true
  try {
    if (!articleId.value) {
      ElMessage.error('文章ID不存在')
      router.push('/')
      return
    }
    
    const response = await axios.get(`http://localhost:3000/article/${articleId.value}`)
    console.log('Direct article detail response:', response.data)
    
    // 处理API返回的数据结构，可能是直接返回文章对象，也可能是包含在data字段中
    const articleData = response.data && response.data.data ? response.data.data : response.data
    
    if (articleData) {
      
      // 处理文章内容
      if (articleData.content) {
        if (typeof articleData.content === 'object') {
          // 如果content是对象
          if (articleData.content.text) {
            articleContent.value = articleData.content.text
          }
          
          // 处理图片
          if (articleData.content.image) {
            articleImage.value = articleData.content.image
          }
          
          // 如果没有text字段，尝试JSON字符串化
          if (!articleData.content.text) {
            articleContent.value = JSON.stringify(articleData.content)
          }
        } else if (typeof articleData.content === 'string') {
          // 如果content直接是字符串
          articleContent.value = articleData.content
        } else {
          // 其他情况，尝试JSON字符串化
          articleContent.value = JSON.stringify(articleData.content)
        }
      }
      
      // 处理标签
      let labelText = ''
      if (articleData.label && articleData.label.name) {
        labelText = articleData.label.name
      } else if (articleData.labels) {
        labelText = articleData.labels
      }
      
      article.value = {
        id: articleData.id || '',
        title: articleData.title || '无标题',
        content: articleContent.value,
        cover: articleData.cover || articleImage.value || null,
        labels: labelText,
        is_published: articleData.is_published !== false,
        createTime: articleData.createTime || articleData.created_at || new Date().toISOString(),
        updateTime: articleData.updateTime || articleData.updated_at || new Date().toISOString()
      }
      
      // 设置页面标题
      document.title = articleData.title ? `${articleData.title} - GCB-Blog` : 'GCB-Blog - 文章详情'
    } else {
      // 如果API返回为空，尝试从localStorage获取
      if (!getArticleFromLocalStorage()) {
        notFound.value = true
        ElMessage.error('文章不存在或已被删除')
      }
    }
  } catch (error) {
    console.error('获取文章失败:', error)
    
    // 如果API请求失败，尝试从localStorage获取
    if (!getArticleFromLocalStorage()) {
      ElMessage.error('获取文章失败，请稍后再试')
      notFound.value = true
    }
  } finally {
    loading.value = false
  }
}

// 使用API获取文章详情
const fetchArticleDetail = async () => {
  loading.value = true
  try {
    if (!articleId.value) {
      ElMessage.error('文章ID不存在')
      router.push('/')
      return
    }
    
    const response = await getArticle(articleId.value)
    console.log('Article detail response:', response)
    
    // 处理响应数据
    if (response && typeof response === 'object') {
      let articleData: any = null
      
      if ('data' in response && response.data) {
        articleData = response.data
      } else if (!('data' in response)) {
        articleData = response
      }
      
      if (articleData) {
        // 处理文章内容
        if (articleData.content) {
          if (typeof articleData.content === 'object') {
            // 如果content是对象
            if (articleData.content.text) {
              articleContent.value = articleData.content.text
            }
            
            // 处理图片
            if (articleData.content.image) {
              articleImage.value = articleData.content.image
            }
            
            // 如果没有text字段，尝试JSON字符串化
            if (!articleData.content.text) {
              articleContent.value = JSON.stringify(articleData.content)
            }
          } else if (typeof articleData.content === 'string') {
            // 如果content直接是字符串
            articleContent.value = articleData.content
          } else {
            // 其他情况，尝试JSON字符串化
            articleContent.value = JSON.stringify(articleData.content)
          }
        }
        
        // 处理标签
        let labelText = ''
        if (articleData.label && articleData.label.name) {
          labelText = articleData.label.name
        } else if (articleData.labels) {
          labelText = articleData.labels
        }
        
        article.value = {
          ...articleData,
          content: articleContent.value,
          cover: articleData.cover || articleImage.value || null,
          labels: labelText
        }
        
        // 设置页面标题
        document.title = articleData.title ? `${articleData.title} - GCB-Blog` : 'GCB-Blog - 文章详情'
      } else {
        // 如果API返回为空，尝试从localStorage获取
        if (!getArticleFromLocalStorage()) {
          notFound.value = true
          ElMessage.error('文章不存在或已被删除')
        }
      }
    } else {
      // 如果API返回为空，尝试从localStorage获取
      if (!getArticleFromLocalStorage()) {
        notFound.value = true
        ElMessage.error('文章不存在或已被删除')
      }
    }
  } catch (error) {
    console.error('获取文章失败:', error)
    
    // 如果API请求失败，尝试从localStorage获取
    if (!getArticleFromLocalStorage()) {
      // 尝试直接获取
      fetchArticleDirectly()
    }
  } finally {
    loading.value = false
  }
}

// 格式化日期
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

// 返回首页
const goBack = () => {
  router.push('/')
}

// 初始化
onMounted(() => {
  // 先尝试从localStorage中获取数据
  if (!getArticleFromLocalStorage()) {
    // 如果localStorage中没有数据，则尝试从API获取
  fetchArticleDetail()
  } else {
    // 如果从localStorage获取成功，直接结束加载状态
    loading.value = false
  }
})
</script>

<template>
  <div>
    <FrontendNav />
    <div class="detail-container">
      <!-- 返回按钮 -->
      <div class="back-button" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        <span>返回首页</span>
      </div>
      
      <!-- 文章内容 -->
      <div v-if="!loading && article && !notFound" class="article-content">
        <!-- 文章头部 -->
        <header class="article-header">
          <h1 class="article-title">{{ article.title }}</h1>
          <div class="article-meta">
            <div class="article-date">
              <el-icon><Calendar /></el-icon>
              <span>{{ formatDate(article.createTime) }}</span>
            </div>
            <div class="article-labels" v-if="article.labels && article.labels.length">
              <el-icon><Calendar /></el-icon>
              <span v-for="label in article.labels.split(',')" :key="label" class="article-label">{{ label }}</span>
            </div>
          </div>
        </header>
        
        <!-- 文章封面图 -->
        <div class="article-cover" v-if="article.cover">
          <img :src="article.cover" alt="文章封面" />
        </div>
        
        <!-- 文章正文 -->
        <div class="article-body">
          <div class="article-text" v-html="article.content"></div>
        </div>
      </div>
      
      <!-- 文章不存在 -->
      <div v-else-if="!loading && notFound" class="article-not-found">
        <el-empty description="文章不存在或已被删除" :image-size="200">
          <template #description>
            <p>该文章可能不存在或已被删除</p>
          </template>
          <el-button type="primary" @click="goBack">返回首页</el-button>
        </el-empty>
      </div>
      
      <!-- 加载骨架屏 -->
      <div v-else class="article-skeleton">
        <el-skeleton animated :rows="10" :loading="loading">
          <template #template>
            <div style="padding: 20px;">
              <el-skeleton-item variant="h1" style="width: 80%" />
              <div style="display: flex; align-items: center; margin: 20px 0;">
                <el-skeleton-item variant="text" style="margin-right: 16px; width: 100px;" />
                <el-skeleton-item variant="text" style="width: 60px;" />
              </div>
              <el-skeleton-item variant="image" style="width: 100%; height: 400px; margin: 20px 0;" />
              <el-skeleton-item variant="p" style="width: 100%" />
              <el-skeleton-item variant="p" style="width: 100%" />
              <el-skeleton-item variant="p" style="width: 100%" />
              <el-skeleton-item variant="p" style="width: 100%" />
              <el-skeleton-item variant="p" style="width: 90%" />
              <el-skeleton-item variant="p" style="width: 80%" />
              <el-skeleton-item variant="p" style="width: 70%" />
            </div>
          </template>
        </el-skeleton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  color: #333;
}

.back-button {
  display: inline-flex;
  align-items: center;
  margin-bottom: 40px;
  padding: 10px 20px;
  background-color: #f8f8f8;
  border-radius: 30px;
  font-size: 0.9rem;
  color: #555;
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-button:hover {
  background-color: #eee;
  transform: translateX(-5px);
}

.back-button .el-icon {
  margin-right: 8px;
  font-size: 1rem;
}

.article-content {
  animation: fadeIn 0.8s ease;
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

.article-header {
  margin-bottom: 40px;
}

.article-title {
  font-size: 3rem;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 20px;
  letter-spacing: -0.5px;
  color: #1a2a6c;
}

.article-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  font-size: 0.95rem;
  color: #666;
}

.article-date {
  position: relative;
  display: flex;
  align-items: center;
  gap: 5px;
}

.article-labels {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.article-label {
  background-color: #f0f0f0;
  color: #555;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  transition: all 0.3s ease;
  margin-left: 5px;
}

.article-label:hover {
  background-color: #e0e0e0;
}

.article-cover {
  margin-bottom: 40px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  transition: all 0.5s ease;
}

.article-cover:hover {
  transform: scale(1.01);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
}

.article-cover img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
}

.article-body {
  font-size: 1.1rem;
  line-height: 1.8;
  color: #333;
}

.article-text {
  margin-bottom: 60px;
}

/* 文章内容样式 */
.article-text :deep(h2) {
  font-size: 2rem;
  font-weight: 600;
  margin: 40px 0 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
  color: #1a2a6c;
}

.article-text :deep(h3) {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 30px 0 15px;
  color: #1a2a6c;
}

.article-text :deep(p) {
  margin-bottom: 20px;
}

.article-text :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 20px 0;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.article-text :deep(img:hover) {
  transform: scale(1.02);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.article-text :deep(blockquote) {
  border-left: 4px solid #1a2a6c;
  padding: 0 20px;
  margin: 20px 0;
  color: #666;
  font-style: italic;
  background-color: #f9f9f9;
  border-radius: 0 8px 8px 0;
}

.article-text :deep(pre) {
  background-color: #f6f8fa;
  border-radius: 6px;
  padding: 16px;
  overflow: auto;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 20px 0;
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.05);
}

.article-text :deep(code) {
  background-color: #f6f8fa;
  border-radius: 3px;
  padding: 2px 5px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.9em;
}

.article-text :deep(ul), .article-text :deep(ol) {
  margin: 20px 0;
  padding-left: 30px;
}

.article-text :deep(li) {
  margin-bottom: 10px;
}

.article-text :deep(a) {
  color: #1a2a6c;
  text-decoration: none;
  border-bottom: 1px solid #1a2a6c;
  transition: all 0.3s ease;
}

.article-text :deep(a:hover) {
  color: #b21f1f;
  border-bottom-color: #b21f1f;
}

.article-text :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  overflow: hidden;
}

.article-text :deep(th), .article-text :deep(td) {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}

.article-text :deep(th) {
  background-color: #f6f8fa;
  font-weight: 600;
}

.article-text :deep(tr:nth-child(even)) {
  background-color: #f9f9f9;
}

.article-text :deep(tr:hover) {
  background-color: #f0f0f0;
}

.article-not-found {
  text-align: center;
  padding: 60px 0;
}

/* 响应式样式 */
@media (max-width: 768px) {
  .detail-container {
    padding: 20px;
  }
  
  .article-title {
    font-size: 2rem;
  }
  
  .article-body {
    font-size: 1rem;
  }
  
  .article-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
</style>
