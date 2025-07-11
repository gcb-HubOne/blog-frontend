<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch, reactive, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import type { Article } from '../../api/article'
import { ElSkeleton, ElSkeletonItem, ElEmpty, ElMessage, ElDatePicker } from 'element-plus'
import FrontendNav from '../../components/FrontendNav.vue'

// 定义标签类型
interface Tag {
  id: number;
  name: string;
}

// 路由
const router = useRouter()

// 文章数据
const articles = ref<Article[]>([])
// 保存全部文章，用于前端快速过滤
const allArticles = ref<Article[]>([])
const loading = ref(true)
const currentPage = ref(1)
const pageSize = ref(6)
const total = ref(0)
const loadingError = ref(false);

// 搜索与筛选
const filters = reactive({
  query: '',
  tags: [] as string[],
  dateRange: undefined as [string, string] | undefined,
});
const allTags = ref<Tag[]>([]);
const searchVisible = ref(false);

// 根据文章内容生成相关图片
function getRelatedImage(article: Article, preferFallback = false) {
  // 如果文章已有封面图片，直接使用
  if (article.cover && article.cover.startsWith('http')) {
    return article.cover;
  }
  
  // 提取关键词，优先使用标签
  let keywords = article.labels ? article.labels.split(',')[0].trim() : '';
  
  // 如果没有标签，从标题提取关键词
  if (!keywords && article.title) {
    const titleWords = article.title.split(/\s+/).filter(word => word.length > 2);
    if (titleWords.length > 0) {
      keywords = titleWords[0];
    }
  }
  
  // 如果还是没有关键词，从内容中提取
  if (!keywords && article.content) {
    const contentText = typeof article.content === 'string' ? article.content : JSON.stringify(article.content);
    const contentWords = contentText.split(/\s+/).filter(word => word.length > 3);
    if (contentWords.length > 0) {
      // 选择较长的词作为关键词
      keywords = contentWords.sort((a, b) => b.length - a.length)[0];
    }
  }
  
  // 如果没有提取到关键词，使用积极阳光的默认关键词
  if (!keywords) {
    const defaultKeywords = ['nature', 'technology', 'business', 'programming', 'success'];
    keywords = defaultKeywords[Math.floor(Math.random() * defaultKeywords.length)];
  }
  
  // 确保关键词是英文，便于图片API检索
  if (/[\u4e00-\u9fa5]/.test(keywords)) {
    // 将中文关键词映射为相关英文词
    const chineseToEnglish = {
      '前端': 'frontend',
      '后端': 'backend',
      '技术': 'technology',
      '编程': 'programming',
      '数据库': 'database',
      '设计': 'design',
      '开发': 'development',
      '学习': 'learning',
      '教程': 'tutorial',
      'Vue': 'vuejs',
      'React': 'reactjs',
      'Java': 'java',
      'Spring': 'spring',
      'Nest': 'nestjs',
      'Hono': 'programming',
      'SQL': 'database',
      'JavaScript': 'javascript',
      'TypeScript': 'typescript'
    };
    
    // 尝试匹配已知词汇映射
    let matched = false;
    for (const [cn, en] of Object.entries(chineseToEnglish)) {
      if (keywords.includes(cn)) {
        keywords = en;
        matched = true;
        break;
      }
    }
    
    // 如果没有匹配，使用默认英文关键词
    if (!matched) {
      keywords = 'technology';
    }
  }
  
  // 创建稳定的随机数，确保相同文章每次生成相同的图片
  const seed = article.id ? parseInt(article.id.toString().replace(/\D/g, '') || '100') : Math.floor(Math.random() * 1000);
  
  // 使用多个图片服务，增加可靠性
  const imageServices = [
    // Picsum Photos - 可靠且无需授权
    `https://picsum.photos/seed/${seed}/800/450`,
    // LoremFlickr 备选
    `https://loremflickr.com/800/450/${keywords}?lock=${seed}`,
    // 最终占位图
    `https://placehold.co/800x450?text=No+Image`
  ];
  const index = preferFallback ? 1 : 0;
  console.log(`为文章"${article.title}"生成图片，关键词: ${keywords}, 使用服务索引 ${index}`);
  return imageServices[index];
}

// 读取本地 token（假设登录后存入 localStorage）
function getAuthHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// 从API获取标签列表
const fetchTags = async () => {
  try {
    const response = await axios.get('/api/label', {
      headers: {
        ...getAuthHeaders(),
        Accept: 'application/json'
      }
    });
    const responseData = response.data;
    
    if (responseData && Array.isArray(responseData.data)) {
        // Case { data: [...] }
        allTags.value = responseData.data;
    } else if (responseData && Array.isArray(responseData)) {
        // Case [...]
        allTags.value = responseData;
    } else {
        allTags.value = [];
        console.warn('获取到的标签数据格式不正确', responseData);
    }
    console.log('成功获取标签列表:', allTags.value);
  } catch (error) {
    console.error('获取标签列表失败:', error);
    ElMessage.error('获取标签列表失败');
  }
}

// 从API获取文章列表
const fetchArticles = async () => {
  loading.value = true;
  loadingError.value = false;
  
  try {
    const params = new URLSearchParams();
    if (filters.query) {
      params.append('query', filters.query);
    }
    if (filters.tags.length > 0) {
      params.append('tags', filters.tags.join(','));
    }
    if (filters.dateRange && filters.dateRange.length === 2) {
      params.append('startDate', filters.dateRange[0]);
      params.append('endDate', filters.dateRange[1]);
    }
    params.append('page', currentPage.value.toString());
    params.append('pageSize', pageSize.value.toString());
    
    // 使用相对路径，以便Vite代理
    console.log('开始获取文章数据，参数:', params.toString());
    const response = await axios.get('/api/article', {
      params,
      headers: {
        ...getAuthHeaders(),
        Accept: 'application/json'
      }
    });
      
    const responseData = response.data?.data || [];
    const totalCount = response.data?.total || 0;
    
    if (Array.isArray(responseData)) {
      console.log(`成功获取到${responseData.length}篇文章`);
      
      const mapped = responseData.map((item: any) => ({
        id: item.id?.toString() || `temp-${Math.random().toString(36).substr(2, 9)}`,
        title: item.title || '无标题',
        content: item.content?.text || item.content || '',
        cover: item.cover || getRelatedImage({
          ...item,
          id: item.id?.toString(),
          labels: item.label?.name || ''
        }),
        labels: item.label?.name || '',
        is_published: item.is_published !== false,
        createTime: item.createTime || item.created_at || new Date().toISOString(),
        updateTime: item.updateTime || item.updated_at || new Date().toISOString()
      }));
      
      // 保存一份完整列表用于前端过滤
      allArticles.value = mapped;
      articles.value = [...mapped];
      total.value = totalCount || mapped.length;
      console.log('处理后的文章数据:', articles.value);
    } else {
      console.warn('API返回的数据格式不正确');
      articles.value = [];
      total.value = 0;
    }
  } catch (error) {
    console.error('获取文章列表失败:', error);
    ElMessage.error('获取文章列表失败');
    articles.value = [];
    total.value = 0;
    loadingError.value = true;
  } finally {
    loading.value = false;
  }
};

// 触发搜索
const handleSearch = async () => {
  currentPage.value = 1;

  // 如果尚未加载文章数据，先获取
  if (allArticles.value.length === 0) {
    await fetchArticles();
  }

  const hasText = filters.query.trim() !== '';
  const hasTag = filters.tags.length > 0;
  const hasDate = !!(filters.dateRange && filters.dateRange.length === 2);

  if (hasText || hasTag || hasDate) {
    applyLocalFilters();
  } else {
    // 没有任何条件，显示全部
    articles.value = [...allArticles.value];
    total.value = allArticles.value.length;
  }
};

// 本地过滤函数，保证搜索立即生效（后端可选支持）
function applyLocalFilters() {
  let filtered = [...allArticles.value];
  // 关键词
  if (filters.query.trim()) {
    // 统一去除首尾空格，提升搜索容错率
    const kw = filters.query.toLowerCase().trim();
    filtered = filtered.filter(a =>
      a.title.toLowerCase().includes(kw) ||
      (typeof a.content === 'string' && a.content.toLowerCase().includes(kw))
    );
  }
  // 标签
  if (filters.tags.length) {
    filtered = filtered.filter(a =>
      filters.tags.every(tag => a.labels?.toLowerCase().includes(tag.toLowerCase()))
    );
  }
  // 日期范围
  if (filters.dateRange && filters.dateRange.length === 2) {
    const [start, end] = filters.dateRange;
    if (start && end) {
      const s = new Date(start as string);
      const e = new Date(end as string);
      filtered = filtered.filter(a => {
        const d = new Date(a.createTime as string);
        return d >= s && d <= e;
      });
    }
  }
  articles.value = filtered;
  total.value = filtered.length;
}

// 切换标签选择
const toggleTag = (tagName: string) => {
  const index = filters.tags.indexOf(tagName);
  if (index > -1) {
    filters.tags.splice(index, 1);
  } else {
    filters.tags.push(tagName);
  }
  handleSearch(); // 标签变化立即过滤
};

// 已移除清空筛选按钮，无需单独函数

// 监听 filters 变化实时过滤
watch(filters, () => {
  handleSearch();
}, { deep: true });

// 监听文章列表变化，重新触发淡入动画，避免过滤后卡片保持透明
watch(articles, () => {
  nextTick(() => {
    document.querySelectorAll('.article-card').forEach((el, index) => {
      (el as HTMLElement).style.opacity = '1';
      (el as HTMLElement).style.transform = 'translateY(0)';
    });
  });
});

// 切换搜索面板显示
function toggleSearch() {
  searchVisible.value = !searchVisible.value;
}

// 截取内容摘要
const getExcerpt = (content: string | any, length = 150) => {
  if (!content) return '暂无内容';
  
  // 确保content是字符串类型
  const contentStr = typeof content === 'string' 
    ? content 
    : (typeof content === 'object' && content !== null)
      ? JSON.stringify(content)
      : String(content);
      
  // 移除HTML标签
  const plainText = contentStr.replace(/<[^>]+>/g, '');
  if (plainText.length <= length) return plainText;
  return plainText.substring(0, length) + '...';
}

// 格式化日期
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return '未知日期';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
    return '日期格式错误';
  }
}

// 处理文章点击
const handleArticleClick = (id: string) => {
  // 由于不再有allArticles，我们只传递ID
  // 详情页需要自己根据ID获取文章详情
  // 为了平滑过渡，可以临时将当前文章信息存入sessionStorage
  const article = articles.value.find(a => a.id === id);
  if (article) {
    sessionStorage.setItem('currentArticle', JSON.stringify(article));
  }
  router.push(`/detail/${id}`);
}

// 处理页码变化
const handlePageChange = (page: number) => {
  currentPage.value = page;
  fetchArticles(); // 换页时重新获取数据
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 处理图片加载错误
const handleImageError = (event: Event, article: Article) => {
  console.error(`图片加载失败: ${article.cover}`);
  // 若已尝试过 Picsum，则使用占位图
  if (article.cover?.includes('picsum.photos')) {
    article.cover = getRelatedImage({...article, id: article.id + Date.now()}, true);
  } else {
    article.cover = 'https://placehold.co/800x450?text=No+Image';
  }
  console.log(`重新生成图片: ${article.cover}`);
}

// 页面滚动效果
const handleScroll = () => {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const heroSection = document.querySelector('.hero-parallax');
  if (heroSection) {
    (heroSection as HTMLElement).style.transform = `translateY(${scrollTop * 0.3}px)`;
  }
}

// 初始化
onMounted(() => {
  // 同时加载初始文章和标签列表
  fetchArticles();
  fetchTags();
  
  // 添加滚动事件
  window.addEventListener('scroll', handleScroll);
  
  // 添加自定义动画类
  setTimeout(() => {
    document.querySelectorAll('.fade-in').forEach((el, index) => {
      setTimeout(() => {
        (el as HTMLElement).style.opacity = '1';
        (el as HTMLElement).style.transform = 'translateY(0)';
      }, index * 100);
    });
  }, 100);
});

// 清理事件
onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<template>
  <div class="home-page">
    <FrontendNav />
    
    <!-- 已移除清空提示横幅 -->
    
    <!-- 顶部横幅 - 简洁现代设计 -->
      <section class="hero-section">
      <div class="hero-parallax"></div>
        <div class="hero-overlay"></div>
        <div class="hero-content">
        <h1 class="hero-title fade-in">探索思想的边界</h1>
        <p class="hero-subtitle fade-in">每一篇文章都是一次心灵的旅程</p>
        </div>
      </section>
      
    <!-- 搜索区域 -->
    <section class="search-section container fade-in">
      <div class="search-toggle" @click="toggleSearch">
        <i class="el-icon-search"></i>
        <span>{{ searchVisible ? '收起高级搜索' : '展开高级搜索' }}</span>
        <i :class="searchVisible ? 'el-icon-arrow-up' : 'el-icon-arrow-down'" class="toggle-icon"></i>
      </div>
      
      <div class="search-panel" v-show="searchVisible">
        <div class="search-panel-header">
          <h3 class="search-panel-title">文章搜索</h3>
          <p class="search-panel-subtitle">可按标题、内容、标签或日期筛选文章</p>
        </div>
        <div class="search-row">
          <div class="search-input-wrapper">
            <i class="el-icon-search search-icon"></i>
            <input 
              type="text" 
              v-model="filters.query" 
              placeholder="搜索文章标题或内容..." 
              class="search-input"
              @keyup.enter="handleSearch"
            />
            <button class="btn-clear-input" v-if="filters.query" @click="filters.query = ''">
              <i class="el-icon-close"></i>
            </button>
          </div>
          <button class="btn-search" @click="handleSearch">
            <i class="el-icon-search"></i>
            <span>搜索</span>
          </button>
          <!-- 移除刷新图片和清空筛选按钮 -->
        </div>
        
        <div class="search-row tags-row">
          <div class="search-label">按标签筛选:</div>
          <div class="tags-container">
            <span 
              v-for="tag in allTags" 
              :key="tag.id" 
              class="filter-tag" 
              :class="{ active: filters.tags.includes(tag.name) }"
              @click="toggleTag(tag.name)"
            >
              {{ tag.name }}
            </span>
          </div>
        </div>
        
        <div class="search-row date-row">
          <div class="search-label">按日期筛选:</div>
          <div class="date-picker-container">
            <el-date-picker
              v-model="filters.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              style="width: 100%;"
              value-format="YYYY-MM-DD"
              @change="handleSearch"
            />
          </div>
        </div>
        
        <div class="search-results" v-if="filters.query || filters.tags.length > 0 || filters.dateRange">
          找到 <span class="result-count">{{ total }}</span> 篇文章
        </div>
      </div>
    </section>
    
    <!-- 文章列表 -->
    <section class="articles-section container">
      <div class="section-header fade-in">
        <h2 class="section-title">精选文章</h2>
        <div class="title-underline"></div>
      </div>
      
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p class="loading-text">正在加载文章...</p>
      </div>
      
      <!-- 文章列表 -->
      <div v-else-if="articles.length > 0" class="articles-grid">
        <div 
          v-for="(article, index) in articles" 
          :key="article.id" 
          class="article-card fade-in" 
          @click="handleArticleClick(article.id)"
          :style="{ transitionDelay: index * 100 + 'ms' }"
        >
            <div class="article-image">
              <img 
                :src="article.cover || getRelatedImage(article)" 
                @error="handleImageError($event, article)" 
                class="article-cover-img"
                alt="文章封面"
              />
              <div class="image-loading-overlay" v-if="loading && index < 6">
                <div class="loading-spinner"></div>
              </div>
              <div class="article-labels" v-if="article.labels && article.labels.length">
                <span v-for="label in article.labels.split(',')" :key="label" class="article-label">{{ label }}</span>
              </div>
            </div>
            <div class="article-content">
              <h3 class="article-title">{{ article.title }}</h3>
              <p class="article-date">{{ formatDate(article.createTime) }}</p>
              <p class="article-excerpt">{{ getExcerpt(article.content) }}</p>
              <div class="article-footer">
              <span class="read-more">阅读全文</span>
              </div>
            </div>
          </div>
        </div>
        
      <!-- 无结果提示 -->
      <div v-else class="no-data fade-in">
        <el-empty description="未找到匹配的文章" :image-size="200">
            <template #description>
            <p v-if="!loadingError">没有符合当前筛选条件的文章，请尝试调整搜索条件</p>
            <p v-else>加载文章时遇到问题，请检查网络连接或稍后重试。</p>
            </template>
          </el-empty>
        </div>
        
        <!-- 分页 -->
      <div class="pagination-container fade-in" v-if="total > pageSize">
          <el-pagination
            background
            layout="prev, pager, next"
            :total="total"
            :page-size="pageSize"
            :current-page="currentPage"
            @current-change="handlePageChange"
            hide-on-single-page
          />
        </div>
      </section>
  </div>
</template>

<style scoped>
/* 全局样式 */
.home-page {
  width: 100%;
  overflow-x: hidden;
  position: relative;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  color: #333;
  background-color: #fff;
}

/* 筛选状态提示 */
.filter-status-banner {
  background-color: #f0f9eb;
  color: #67c23a;
  padding: 10px 20px;
  text-align: center;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  animation: fadeIn 0.5s ease;
  border-bottom: 1px solid #e1f3d8;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 自定义动画类 */
.fade-in {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* 顶部横幅 */
.hero-section {
  position: relative;
  height: 40vh;
  min-height: 300px;
  max-height: 500px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40px;
}

.hero-parallax {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 120%;
  background: linear-gradient(135deg, #3a7bd5, #00d2ff);
  z-index: 0;
  transform: translateY(0);
  will-change: transform;
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.2);
  z-index: 1;
}

.hero-content {
  text-align: center;
  color: white;
  z-index: 2;
  padding: 0 20px;
  position: relative;
}

.hero-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 15px;
  letter-spacing: 2px;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3);
}

.hero-subtitle {
  font-size: 1.2rem;
  font-weight: 400;
  max-width: 600px;
  margin: 0 auto;
  letter-spacing: 1px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

/* 搜索区域 */
.search-section {
  margin-bottom: 40px;
}

.search-toggle {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 14px;
  background-color: #f8f8f8;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  font-weight: 500;
  color: #555;
  margin-bottom: 15px;
}

.search-toggle:hover {
  background-color: #eee;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.search-panel {
  background-color: #f8f8f8;
  border-radius: 10px;
  padding: 25px;
  margin-top: 10px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  animation: slideDown 0.3s ease;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.search-row {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  position: relative;
}

.search-row:last-child {
  margin-bottom: 0;
}

.search-section {
  position: relative;
  z-index: 10;
}

.search-panel-header {
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.search-panel-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.search-panel-subtitle {
  font-size: 0.9rem;
  color: #666;
  margin: 0;
}

.toggle-icon {
  margin-left: 8px;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  overflow: hidden;
  transition: all 0.3s;
}

.search-input-wrapper:focus-within {
  border-color: #3a7bd5;
  box-shadow: 0 0 0 2px rgba(58, 123, 213, 0.1);
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #999;
  font-size: 1rem;
}

.search-input {
  flex: 1;
  padding: 10px 15px 10px 35px;
  border: none;
  font-size: 1rem;
  width: 100%;
  background: transparent;
}

.search-input:focus {
  outline: none;
}

.btn-clear-input {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 0 10px;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-clear-input:hover {
  color: #666;
}

.search-label {
  font-weight: 500;
  min-width: 90px;
  color: #555;
}

.btn-search, .btn-refresh, .btn-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 15px;
  border: none;
  border-radius: 6px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  margin-left: 10px;
  min-width: 90px;
}

.btn-search {
  background: #3a7bd5;
}

.btn-refresh {
  background: #67c23a;
}

.btn-clear {
  background: #f56c6c;
}

.btn-search:hover, .btn-refresh:hover, .btn-clear:hover {
  opacity: 0.9;
  transform: translateY(-2px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  }

.btn-important {
  background: linear-gradient(135deg, #f56c6c, #e74c3c);
  font-weight: 600;
  box-shadow: 0 3px 8px rgba(245, 108, 108, 0.3);
  min-width: 150px;
}

.btn-important:hover {
  background: linear-gradient(135deg, #e74c3c, #f56c6c);
  box-shadow: 0 5px 12px rgba(245, 108, 108, 0.4);
}

.btn-search i, .btn-refresh i, .btn-clear i {
  margin-right: 5px;
  font-size: 1rem;
}

@media (max-width: 768px) {
  .btn-text {
    display: none;
  }
  
  .btn-search, .btn-refresh, .btn-clear {
    min-width: auto;
    padding: 10px;
  }
}

.date-row {
  flex-wrap: wrap;
}

.date-picker-container {
  flex: 1;
}

.result-count {
  font-weight: 600;
  color: #3a7bd5;
}

.tags-row {
  flex-wrap: wrap;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  flex: 1;
}

.filter-tag {
  padding: 8px 16px;
  background-color: #eee;
  border-radius: 20px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid transparent;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: inline-flex;
  align-items: center;
}

.filter-tag:hover {
  background-color: #e0e0e0;
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
  }

.filter-tag.active {
  background-color: #3a7bd5;
  color: white;
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 5px rgba(58, 123, 213, 0.3);
}

.search-results {
  font-size: 0.95rem;
  color: #666;
  margin-top: 20px;
  text-align: right;
  padding: 12px 15px;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  border-left: 3px solid #3a7bd5;
}

/* 文章部分 */
.articles-section {
  padding: 20px 0 60px;
}

.section-header {
  text-align: center;
  margin-bottom: 40px;
}

.section-title {
  font-size: 2rem;
  font-weight: 300;
  color: #333;
  margin-bottom: 15px;
}

.title-underline {
  width: 60px;
  height: 3px;
  background-color: #3a7bd5;
  margin: 0 auto;
  transition: width 0.3s ease;
}

.section-header:hover .title-underline {
  width: 100px;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 50px 0;
  margin-bottom: 30px;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 4px solid rgba(58, 123, 213, 0.2);
  border-top-color: #3a7bd5;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

.loading-text {
  font-size: 1.1rem;
  color: #666;
  font-weight: 500;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 30px;
  margin-bottom: 50px;
}

.article-card {
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.article-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
}

.article-image {
  height: 200px;
  position: relative;
  background-color: #f5f5f5;
  overflow: hidden;
}

.article-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.article-card:hover .article-cover-img {
  transform: scale(1.05);
}

.image-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid rgba(58, 123, 213, 0.2);
  border-top-color: #3a7bd5;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.article-labels {
  position: absolute;
  bottom: 15px;
  left: 15px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.article-label {
  background-color: #3a7bd5;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.article-content {
  padding: 25px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.article-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 10px;
  line-height: 1.4;
  color: #333;
  transition: color 0.3s ease;
}

.article-card:hover .article-title {
  color: #3a7bd5;
}

.article-date {
  color: #888;
  font-size: 0.85rem;
  margin-bottom: 15px;
}

.article-excerpt {
  font-size: 1rem;
  line-height: 1.6;
  color: #666;
  margin-bottom: 20px;
  flex-grow: 1;
}

.article-footer {
  margin-top: auto;
  text-align: right;
}

.read-more {
  color: #3a7bd5;
  font-weight: 500;
  font-size: 0.9rem;
  position: relative;
  padding-bottom: 2px;
  border-bottom: 1px solid transparent;
  transition: all 0.3s ease;
}

.article-card:hover .read-more {
  border-bottom-color: #3a7bd5;
}

/* 分页 */
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}

/* 无数据状态 */
.no-data {
  padding: 60px 0;
  text-align: center;
}

.no-data .btn-clear {
  margin-top: 15px;
  display: inline-block;
}

.btn-large {
  padding: 12px 25px;
  font-size: 1.05rem;
  border-radius: 8px;
  transition: all 0.3s;
}

.btn-large:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(245, 108, 108, 0.3);
}

/* 响应式样式 */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2.2rem;
  }
  
  .hero-subtitle {
    font-size: 1rem;
  }
  
  .articles-grid {
    grid-template-columns: 1fr;
    gap: 25px;
  }
  
  .section-title {
    font-size: 1.8rem;
  }
  
  .hero-section {
    min-height: 250px;
  }
  
  .search-row {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .search-label {
    margin-bottom: 10px;
  }
  
  .search-input {
    width: 100%;
  }
  
  .btn-refresh, .btn-clear {
    align-self: flex-end;
  }
}
</style>