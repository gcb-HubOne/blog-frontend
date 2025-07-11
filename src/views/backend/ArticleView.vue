<script setup lang="ts">
import { ref, reactive, onMounted, computed, shallowRef, onBeforeUnmount } from 'vue'
import { 
  Document, Search, Plus, Delete, Edit, 
  View, Download, Picture, Refresh, Calendar,
  Filter, ArrowDown, ArrowUp, ArrowLeft, ArrowRight
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as adminApi from '../../api/admin'
import type { ArticleData, ArticleContent } from '../../api/admin'
import { getAllLabels } from '../../api/label'
import type { Label } from '../../api/label'
// 引入wangEditor
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import { Boot } from '@wangeditor/editor'
import markdownModule from '@wangeditor/plugin-md'

// 注册markdown模块
Boot.registerModule(markdownModule)

// 导入编辑器样式
import '@wangeditor/editor/dist/css/style.css'

// 表格数据
interface ArticleItem {
  id: number
  title: string
  label: { name: string } | string
  content: ArticleContent
  createTime: string
  updateTime: string
}

const tableData = ref<ArticleItem[]>([])

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
  loadArticleList()
}

// 处理每页显示记录数变化
const handleSizeChange = (val: number) => {
  pagination.pageSize = val
  pagination.currentPage = 1
  loadArticleList()
}

// 搜索条件
const searchForm = reactive({
  title: '',
  label: '',
  startDate: '',
  endDate: '',
})

// 搜索处理
const handleSearch = () => {
  pagination.currentPage = 1
  loadArticleList()
}

// 重置搜索
const resetSearch = () => {
  searchForm.title = ''
  searchForm.label = ''
  searchForm.startDate = ''
  searchForm.endDate = ''
  pagination.currentPage = 1
  loadArticleList()
}

// 分页跳转
const goToPage = ref<string | number>('')

// 处理跳转到指定页
const handleGoToPage = () => {
  const page = Number(goToPage.value)
  if (page && page > 0 && page <= Math.ceil(pagination.total / pagination.pageSize)) {
    pagination.currentPage = page
    loadArticleList()
  } else {
    ElMessage.warning('请输入有效的页码')
  }
  goToPage.value = ''
}

// 加载文章列表
const loadArticleList = async () => {
  loading.value = true
  tableData.value = []
  
  try {
    // 构建查询参数
    const params: Record<string, any> = {}
    
    // 添加标题搜索
    if (searchForm.title.trim()) {
      params.title = searchForm.title.trim()
    }
    
    // 添加标签搜索
    if (searchForm.label.trim()) {
      params.label = searchForm.label.trim()
    }
    
    // 添加日期范围
    if (searchForm.startDate) {
      params.startDate = searchForm.startDate
    }
    if (searchForm.endDate) {
      params.endDate = searchForm.endDate
    }
    
      // 调用API获取文章列表

    const res = await adminApi.getAllArticles(params)

    
    if (res) {
      // 检查数据结构
      let articleData = null
      const data = res as any
      
      // 直接使用数组数据
      if (Array.isArray(data)) {
        articleData = data
       
      } else if (data.data && Array.isArray(data.data)) {
        // {data: [...]} 结构
        articleData = data.data
        
      } else if (data.items && Array.isArray(data.items)) {
        // {items: [...]} 结构
        articleData = data.items

      } else if (data.list && Array.isArray(data.list)) {
        // {list: [...]} 结构
        articleData = data.list
  
      } else if (data.results && Array.isArray(data.results)) {
        // {results: [...]} 结构
        articleData = data.results

      } else if (data.content && Array.isArray(data.content)) {
        // {content: [...]} 结构
        articleData = data.content

      } else {
 
      }
      
      if (articleData) {
        // 计算总数据量
        pagination.total = data.total || articleData.length
        
        // 如果后端已经实现分页，直接使用返回的数据
        if (data.total !== undefined && data.pageSize !== undefined && data.currentPage !== undefined) {
          tableData.value = articleData
        } else {
          // 前端分页处理
          const startIndex = (pagination.currentPage - 1) * pagination.pageSize
          const endIndex = startIndex + pagination.pageSize
          tableData.value = articleData.slice(startIndex, endIndex)
        }
      } else {
        ElMessage.error('获取文章列表失败：数据格式不支持')
        tableData.value = []
      }
    } else {
      ElMessage.error('获取文章列表失败：返回数据为空')
      tableData.value = []
    }
  } catch (error: any) {

    ElMessage.error(`获取文章列表失败: ${error.message || '请检查网络连接'}`)
    tableData.value = []
  } finally {
    loading.value = false
  }
}

// 删除文章
const handleDeleteArticle = (id: number) => {
  ElMessageBox.confirm('确定要删除此文章吗？此操作不可恢复！', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    loading.value = true
    try {
      await adminApi.deleteArticle(id)
      ElMessage.success('文章删除成功')
      loadArticleList() // 重新加载文章列表
    } catch (error) {
      ElMessage.error('删除文章失败')
    } finally {
      loading.value = false
    }
  }).catch(() => {
    // 用户取消删除
  })
}

// 文章对话框
const articleDialogVisible = ref(false)
const isEditMode = ref(false)
const articleForm = reactive<ArticleData>({
  title: '',
  label: { name: '' },
  content: {
    text: '',
    image: '',
    code: '',
    table: [],
    file: ''
  }
})
const currentArticleId = ref<number | null>(null)
const articleFormRef = ref()

// 富文本编辑器相关
const editorRef = shallowRef()
const toolbarRef = shallowRef()
const editorConfig = {
  placeholder: '请输入内容...',
  MENU_CONF: {
    // 图片上传配置
    uploadImage: {
      server: '/api/upload/image', // 假设这是您的图片上传接口
      fieldName: 'file',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxNumberOfFiles: 10,
      allowedFileTypes: ['image/*'],
      metaWithUrl: true,
      customInsert: (res: any, insertFn: Function) => {
        // 自定义插入图片
        if (res.code === 200 && res.data) {
          const { url, alt, href } = res.data
          insertFn(url, alt, href)
        } else {
          ElMessage.error('图片上传失败')
        }
      },
      onError: (err: any) => {

        ElMessage.error('图片上传失败')
      }
    },
    // 代码高亮配置
    codeSelectLang: {
      codeLangs: [
        { text: 'CSS', value: 'css' },
        { text: 'HTML', value: 'html' },
        { text: 'XML', value: 'xml' },
        { text: 'JavaScript', value: 'javascript' },
        { text: 'TypeScript', value: 'typescript' },
        { text: 'JSX', value: 'jsx' },
        { text: 'Go', value: 'go' },
        { text: 'Java', value: 'java' },
        { text: 'C', value: 'c' },
        { text: 'C++', value: 'cpp' },
        { text: 'C#', value: 'csharp' },
        { text: 'Python', value: 'python' },
        { text: 'Ruby', value: 'ruby' },
        { text: 'PHP', value: 'php' },
        { text: 'Rust', value: 'rust' },
        { text: 'SQL', value: 'sql' },
        { text: 'Bash', value: 'bash' },
        { text: 'Markdown', value: 'markdown' },
        { text: 'JSON', value: 'json' }
      ]
    }
  }
}

// 编辑器内容
const editorValue = ref('')

// 编辑器模式
const editorMode = ref('default') // 'default' 或 'markdown'

// 切换编辑器模式
const toggleEditorMode = () => {
  editorMode.value = editorMode.value === 'default' ? 'markdown' : 'default'
}

// 编辑器创建完成后的回调
const handleCreated = (editor: any) => {
  editorRef.value = editor
  // 初始化时设置内容
  if (articleForm.content.text) {
    editorValue.value = articleForm.content.text
  }
}

// 监听编辑器内容变化
const handleEditorChange = (editor: any) => {
  articleForm.content.text = editor.getHtml()
}

// 在组件销毁前销毁编辑器实例
onBeforeUnmount(() => {
  const editor = editorRef.value
  if (editor) {
    editor.destroy()
  }
})

// 表单验证规则
const articleRules = {
  title: [
    { required: true, message: '请输入文章标题', trigger: 'blur' },
    { min: 1, max: 100, message: '标题长度应在1到100个字符之间', trigger: 'blur' }
  ],
  'label.name': [
    { required: true, message: '请输入文章标签', trigger: 'blur' }
  ]
}

// 打开新建文章对话框
const openCreateArticleDialog = () => {
  isEditMode.value = false
  currentArticleId.value = null
  articleForm.title = ''
  articleForm.label.name = ''
  articleForm.content = {
    text: '',
    image: '',
    code: '',
    table: [],
    file: ''
  }
  editorValue.value = ''
  articleDialogVisible.value = true
  fetchLabels()
}

// 打开编辑文章对话框
const openEditArticleDialog = async (article: ArticleItem) => {
  isEditMode.value = true
  currentArticleId.value = article.id
  loading.value = true
  
  try {
    // 获取文章详情
    const articleDetail = await adminApi.getArticleById(article.id)
    
    if (articleDetail) {
      // 填充表单数据
      const detail = articleDetail as any
      
      articleForm.title = detail.title || ''
      
      // 处理标签
      if (typeof detail.label === 'string') {
        articleForm.label.name = detail.label
      } else if (detail.label && typeof detail.label === 'object') {
        articleForm.label.name = detail.label.name || ''
      }
      
      // 处理内容
      if (detail.content) {
        articleForm.content = {
          text: detail.content.text || '',
          image: detail.content.image || '',
          code: detail.content.code || '',
          table: detail.content.table || [],
          file: detail.content.file || ''
        }
        // 设置编辑器内容
        editorValue.value = detail.content.text || ''
      }
      
      articleDialogVisible.value = true
      fetchLabels()
    } else {
      ElMessage.error('获取文章详情失败')
    }
  } catch (error) {
    ElMessage.error('获取文章详情失败')
  } finally {
    loading.value = false
  }
}

// 提交文章表单
const submitArticleForm = async () => {
  if (!articleFormRef.value) return
  
  await articleFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      loading.value = true
      try {
        // 确保从编辑器获取最新内容
        if (editorRef.value) {
          articleForm.content.text = editorRef.value.getHtml()
        }
        
        if (isEditMode.value && currentArticleId.value) {
          // 更新文章
          await adminApi.updateArticle(currentArticleId.value, articleForm)
          ElMessage.success('文章更新成功')
        } else {
          // 创建文章
          await adminApi.createArticle(articleForm)
          ElMessage.success('文章创建成功')
        }
        articleDialogVisible.value = false
        loadArticleList() // 重新加载文章列表
      } catch (error) {
        ElMessage.error(isEditMode.value ? '更新文章失败' : '创建文章失败')
      } finally {
        loading.value = false
      }
    }
  })
}

// 查看文章详情
const viewArticleDetail = async (id: number) => {
  try {
    loading.value = true

    const article = await adminApi.getArticleById(id)

    
    if (article) {
      const detail = article as any
      
      // 使用对话框展示文章内容，支持HTML渲染
      ElMessageBox.alert(
        `<div class="article-detail">
          <h2>${detail.title || '无标题'}</h2>
          <div class="article-meta">
            <span class="label">标签: ${typeof detail.label === 'string' ? detail.label : detail.label?.name || '-'}</span>
            <span class="time">创建时间: ${detail.createTime ? new Date(detail.createTime).toLocaleString() : '未知'}</span>
          </div>
          <div class="article-content">${detail.content?.text || '无内容'}</div>
        </div>`,
        '文章详情',
        {
          dangerouslyUseHTMLString: true,
          confirmButtonText: '关闭',
          customClass: 'article-detail-dialog',
          callback: () => {
            // 关闭对话框后的回调
          }
        }
      )
    } else {
      ElMessage.error('获取文章详情失败：返回数据为空')
    }
  } catch (error: any) {

    ElMessage.error(`获取文章详情失败: ${error.message || '请检查网络连接'}`)
  } finally {
    loading.value = false
  }
}

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString()
}

// 格式化标签
const formatLabel = (label: any) => {
  if (typeof label === 'string') return label
  if (label && typeof label === 'object' && label.name) return label.name
  return '-'
}

// 表格行样式
const tableRowClassName = ({ row, rowIndex }: { row: ArticleItem, rowIndex: number }) => {
  return rowIndex % 2 === 0 ? 'even-row' : 'odd-row'
}

// 统计数据
const statistics = computed(() => {
  return {
    total: pagination.total,
    today: new Date().toLocaleDateString()
  }
})

// add state
const allLabels = ref<Label[]>([])

const fetchLabels = async () => {
  try {
    const res = await getAllLabels()
    let list: any[] = []
    
    // 增强数据解析逻辑，适应多种后端响应格式
    if (Array.isArray(res)) {
      list = res
    } else if (res && typeof res === 'object') {
      if (Array.isArray((res as any).data)) {
        list = (res as any).data
      } else if (res.data && Array.isArray(res.data.data)) {
        list = res.data.data
      } else if (res.data && Array.isArray(res.data)) {
        list = res.data
      }
    }
    
    allLabels.value = list.map(item => ({
      id: item.id,
      name: item.name,
      color: item.color || '#409EFF'
    }))
  } catch (error) {

    allLabels.value = []
  }
}

// 初始加载
onMounted(() => {
  loadArticleList()
  fetchLabels()
})
</script>

<template>
  <div class="fade-in">
    <div class="dashboard-header">
      <div class="dashboard-title">
        <h3>文章管理中心</h3>
        <p class="subtitle">管理系统中的所有文章内容</p>
      </div>
      <div class="dashboard-actions">
        <el-button type="primary" @click="openCreateArticleDialog" class="action-btn primary-gradient">
          <el-icon><Plus /></el-icon>新建文章
        </el-button>
      </div>
    </div>
    
    <!-- 统计卡片 -->
    <div class="dashboard-stats">
      <div class="stat-card">
        <div class="stat-icon">
          <el-icon><Document /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ statistics.total }}</div>
          <div class="stat-label">总文章数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <el-icon><Calendar /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ statistics.today }}</div>
          <div class="stat-label">今日日期</div>
        </div>
      </div>
    </div>
    
    <!-- 搜索区域 -->
    <el-card shadow="hover" class="search-card">
      <template #header>
        <div class="card-header">
          <span>文章筛选</span>
          <div class="header-actions">
            <el-button text @click="resetSearch" class="header-action">
              <el-icon><Refresh /></el-icon>重置筛选
            </el-button>
          </div>
        </div>
      </template>
      
      <el-form :model="searchForm" label-width="80px" class="search-form" @submit.prevent="handleSearch">
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="标题">
              <el-input v-model="searchForm.title" placeholder="请输入文章标题" clearable @keyup.enter="handleSearch" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="标签">
              <el-input v-model="searchForm.label" placeholder="请输入文章标签" clearable @keyup.enter="handleSearch" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="开始日期">
              <el-date-picker
                v-model="searchForm.startDate"
                type="date"
                placeholder="选择开始日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="结束日期">
              <el-date-picker
                v-model="searchForm.endDate"
                type="date"
                placeholder="选择结束日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item class="search-buttons">
          <el-button type="primary" @click="handleSearch" class="primary-gradient search-btn">
            <el-icon><Search /></el-icon>搜索
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 数据表格卡片 -->
    <el-card shadow="hover" class="data-card">
      <template #header>
        <div class="card-header">
          <span>文章列表</span>
          <div class="header-actions">
            <el-input
              v-model="searchForm.title"
              placeholder="快速搜索标题..."
              class="quick-search-input"
              @keyup.enter="handleSearch"
              clearable
            >
              <template #prefix>
                <el-icon class="search-icon"><Search /></el-icon>
              </template>
            </el-input>
            <el-button text @click="loadArticleList" class="header-action">
              <el-icon><Refresh /></el-icon>刷新
            </el-button>
          </div>
        </div>
      </template>
      
      <el-table
        :data="tableData"
        style="width: 100%"
        v-loading="loading"
        row-key="id"
        border
        :row-class-name="tableRowClassName"
        highlight-current-row
        :header-cell-style="{
          background: 'var(--header-bg-color)',
          color: 'var(--header-text-color)',
          fontWeight: '600',
          fontSize: '14px',
          height: '55px'
        }"
        :cell-style="{
          fontSize: '14px',
          padding: '12px 0'
        }"
        class="elegant-table"
      >
        <el-table-column type="expand">
          <template #default="props">
            <div class="article-detail-expand">
              <div class="detail-section">
                <div class="detail-header">文章信息</div>
                <div class="detail-content">
                  <div class="detail-item">
                    <div class="detail-icon"><el-icon><Document /></el-icon></div>
                    <div class="detail-info">
                      <span class="label">文章ID</span>
                      <span class="value">{{ props.row.id }}</span>
                    </div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-icon"><el-icon><Calendar /></el-icon></div>
                    <div class="detail-info">
                      <span class="label">创建时间</span>
                      <span class="value">{{ formatDate(props.row.createTime) }}</span>
                    </div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-icon"><el-icon><Calendar /></el-icon></div>
                    <div class="detail-info">
                      <span class="label">更新时间</span>
                      <span class="value">{{ formatDate(props.row.updateTime) }}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="detail-section">
                <div class="detail-header">文章内容预览</div>
                <div class="detail-content">
                  <div class="content-preview">
                    <p class="content-text">{{ props.row.content.text }}</p>
                    <div v-if="props.row.content.image" class="content-image">
                      <img :src="props.row.content.image" alt="文章图片" />
                    </div>
                    <pre v-if="props.row.content.code" class="content-code">{{ props.row.content.code }}</pre>
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
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip>
          <template #default="scope">
            <div class="title-cell">
              <div class="icon-wrapper">
                <el-icon><Document /></el-icon>
              </div>
              <div class="title-info">
                <div class="title-text">{{ scope.row.title }}</div>
                <div class="title-subtitle">文章</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="标签" width="120" align="center">
          <template #default="scope">
            <el-tag size="small" effect="plain">{{ formatLabel(scope.row.label) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180" align="center">
          <template #default="scope">
            <div class="time-cell">
              <div class="time-icon">
                <el-icon><Calendar /></el-icon>
              </div>
              <div class="time-info">
                {{ formatDate(scope.row.createTime) }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right" align="center">
          <template #default="scope">
            <div class="table-actions">
              <el-button size="small" type="primary" @click="viewArticleDetail(scope.row.id)" circle :icon="View" />
              <el-button size="small" type="warning" @click="openEditArticleDialog(scope.row)" circle :icon="Edit" />
              <el-button size="small" type="danger" @click="handleDeleteArticle(scope.row.id)" circle :icon="Delete" />
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 空数据显示 -->
      <div v-if="tableData.length === 0 && !loading" class="empty-data">
        <el-empty :image-size="100" description="暂无文章数据">
          <el-button type="primary" @click="openCreateArticleDialog">新建文章</el-button>
        </el-empty>
      </div>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:currentPage="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          background
          class="elegant-pagination"
        ></el-pagination>
      </div>
    </el-card>
  </div>
  
  <!-- 文章表单对话框 -->
  <el-dialog
    v-model="articleDialogVisible"
    :title="isEditMode ? '编辑文章' : '新建文章'"
    width="80%"
    destroy-on-close
    center
    custom-class="elegant-dialog article-editor-dialog"
  >
    <el-form
      ref="articleFormRef"
      :model="articleForm"
      :rules="articleRules"
      label-position="top"
      class="elegant-form"
    >
      <el-form-item label="标题" prop="title">
        <el-input v-model="articleForm.title" placeholder="请输入文章标题" />
      </el-form-item>
      
      <el-form-item label="标签" prop="label.name">
        <el-select
          v-model="articleForm.label.name"
          placeholder="请选择或输入标签"
          filterable
          allow-create
          default-first-option
        >
          <el-option
            v-for="lab in allLabels"
            :key="lab.id || lab.name"
            :label="lab.name"
            :value="lab.name"
          />
        </el-select>
      </el-form-item>
      
      <el-form-item label="内容">
        <div class="editor-container">
          <div class="editor-header">
            <div class="editor-title">文章内容</div>
            <el-switch
              v-model="editorMode"
              active-text="Markdown"
              inactive-text="富文本"
              :active-value="'markdown'"
              :inactive-value="'default'"
              @change="toggleEditorMode"
            />
          </div>
          
          <div class="editor-body">
            <Toolbar
              style="border-bottom: 1px solid #ccc"
              :editor="editorRef"
              :defaultConfig="editorConfig"
              :mode="editorMode"
              ref="toolbarRef"
            />
            <Editor
              style="height: 400px; overflow-y: hidden;"
              v-model="editorValue"
              :defaultConfig="editorConfig"
              :mode="editorMode"
              @onCreated="handleCreated"
              @onChange="handleEditorChange"
            />
          </div>
        </div>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="articleDialogVisible = false" plain class="cancel-btn">取消</el-button>
        <el-button type="primary" @click="submitArticleForm" :loading="loading" class="primary-gradient confirm-btn">
          {{ isEditMode ? '更新' : '创建' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.dashboard-title h3 {
  font-size: 24px;
  margin: 0;
  color: var(--el-text-color-primary);
}

.subtitle {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin: 8px 0 0;
}

.dashboard-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-container {
  width: 220px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
}

.primary-gradient {
  background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-light-3));
  border: none;
}

.dashboard-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  flex: 1;
  background: var(--el-bg-color);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  box-shadow: var(--el-box-shadow-light);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--el-box-shadow);
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--el-color-primary-light-8);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.stat-icon .el-icon {
  font-size: 24px;
  color: var(--el-color-primary);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.data-card {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-action {
  display: flex;
  align-items: center;
  gap: 5px;
}

.elegant-table {
  border-radius: 8px;
  overflow: hidden;
}

.even-row {
  background-color: var(--el-fill-color-lighter);
}

.odd-row {
  background-color: var(--el-bg-color);
}

.id-badge {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
  display: inline-block;
}

.title-cell {
  display: flex;
  align-items: center;
}

.icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--el-color-primary-light-9);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  color: var(--el-color-primary);
}

.title-info {
  display: flex;
  flex-direction: column;
}

.title-text {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.title-subtitle {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.time-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.time-icon {
  color: var(--el-color-info);
}

.table-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.elegant-pagination {
  margin-right: 20px;
}

.empty-data {
  padding: 40px 0;
  text-align: center;
}

.article-detail-expand {
  padding: 20px;
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-header {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-light);
  color: var(--el-text-color-primary);
}

.detail-content {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.detail-item {
  display: flex;
  align-items: center;
  min-width: 200px;
}

.detail-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--el-color-primary-light-9);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.detail-icon .el-icon {
  font-size: 16px;
  color: var(--el-color-primary);
}

.detail-info {
  display: flex;
  flex-direction: column;
}

.detail-info .label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 2px;
}

.detail-info .value {
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.content-preview {
  width: 100%;
  padding: 16px;
  background: var(--el-bg-color);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
}

.content-text {
  margin: 0 0 16px;
  line-height: 1.6;
}

.content-image {
  margin: 16px 0;
}

.content-image img {
  max-width: 100%;
  max-height: 200px;
  border-radius: 4px;
}

.content-code {
  padding: 12px;
  background: var(--el-fill-color);
  border-radius: 4px;
  font-family: monospace;
  overflow-x: auto;
  white-space: pre-wrap;
  margin: 16px 0 0;
}

.search-card {
  margin-bottom: 24px;
}

.search-form {
  padding: 10px 0;
}

.search-buttons {
  display: flex;
  justify-content: center;
  margin-top: 10px;
  margin-bottom: 0;
}

.search-btn {
  min-width: 120px;
}

.quick-search-input {
  width: 220px;
  margin-right: 10px;
}

.elegant-dialog {
  border-radius: 8px;
}

.elegant-form {
  margin-top: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.cancel-btn {
  border-color: var(--el-border-color-light);
}

.confirm-btn {
  min-width: 80px;
}

.editor-container {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color);
}

.editor-title {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.editor-body {
  background-color: #fff;
}

:deep(.w-e-text-container) {
  min-height: 400px !important;
}

:deep(.w-e-toolbar) {
  border-bottom: 1px solid var(--el-border-color-light) !important;
}

:deep(.w-e-text-container [data-slate-editor]) {
  padding: 0 10px 10px;
}

.article-editor-dialog {
  max-width: 1200px;
}

:deep(.article-detail-dialog) {
  max-width: 800px;
}

:deep(.el-message-box__content) {
  max-height: 70vh;
  overflow-y: auto;
}

:deep(.article-detail) {
  padding: 20px;
}

:deep(.article-detail h2) {
  margin-top: 0;
  margin-bottom: 16px;
  color: var(--el-color-primary);
}

:deep(.article-meta) {
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

:deep(.article-content) {
  line-height: 1.8;
  margin-bottom: 20px;
}

:deep(.article-content img) {
  max-width: 100%;
  border-radius: 4px;
  margin: 10px 0;
}

:deep(.article-content pre) {
  padding: 16px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  font-family: monospace;
  overflow-x: auto;
  margin: 20px 0;
}

:deep(.article-content blockquote) {
  border-left: 4px solid var(--el-color-primary-light-5);
  padding-left: 16px;
  color: var(--el-text-color-secondary);
  margin: 16px 0;
}

:deep(.article-content table) {
  border-collapse: collapse;
  width: 100%;
  margin: 16px 0;
}

:deep(.article-content th),
:deep(.article-content td) {
  border: 1px solid var(--el-border-color);
  padding: 8px;
  text-align: left;
}

:deep(.article-content th) {
  background-color: var(--el-fill-color-light);
}

:deep(.article-content a) {
  color: var(--el-color-primary);
  text-decoration: none;
}

:deep(.article-content a:hover) {
  text-decoration: underline;
}

:deep(.article-content ul),
:deep(.article-content ol) {
  padding-left: 20px;
  margin: 16px 0;
}

:deep(.article-content li) {
  margin-bottom: 8px;
}

:deep(.article-content h1),
:deep(.article-content h2),
:deep(.article-content h3),
:deep(.article-content h4),
:deep(.article-content h5),
:deep(.article-content h6) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}

:deep(.article-content h1) {
  font-size: 2em;
}

:deep(.article-content h2) {
  font-size: 1.5em;
}

:deep(.article-content h3) {
  font-size: 1.25em;
}

:deep(.article-content h4) {
  font-size: 1em;
}

:deep(.article-content code) {
  background-color: var(--el-fill-color-light);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}

:deep(.article-content hr) {
  height: 1px;
  background-color: var(--el-border-color);
  border: none;
  margin: 24px 0;
}

/* 动画效果 */
.fade-in {
  animation: fadeIn 0.5s ease-in-out;
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

/* 暗黑模式适配 */
:root {
  --header-bg-color: var(--el-color-primary-light-9);
  --header-text-color: var(--el-color-primary-dark-2);
}

html.dark {
  --header-bg-color: var(--el-color-primary-light-5);
  --header-text-color: var(--el-color-black);
}
</style> 