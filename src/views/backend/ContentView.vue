<script lang="ts" setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { getContent, getContentList, createContent, updateContent, deleteContent } from '../../api/content'
import type { Content, ContentParams } from '../../api/content'
import { getAllLabels } from '../../api/label'
import type { Label } from '../../api/label'

// 状态控制
const loading = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const dialogVisible = ref(false)
const editMode = ref(false)
const currentId = ref('')

// 搜索关键词
const searchKeyword = ref('')

// 表单数据
const form = reactive<ContentParams>({
  title: '',
  content: '',
  content_type: 'text',
  is_published: false,
  labels: []
})

// 表单验证规则
const rules = reactive<FormRules>({
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在2到100个字符之间', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入内容', trigger: 'blur' }
  ],
  content_type: [
    { required: true, message: '请选择内容类型', trigger: 'change' }
  ]
})

// 表格数据
const tableData = ref<Content[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

// 标签数据
const allLabels = ref<Label[]>([])
const labelLoading = ref(false)

// 内容类型选项
const contentTypeOptions = [
  { label: '文本', value: 'text' },
  { label: '图片', value: 'image' },
  { label: '代码', value: 'code' },
  { label: '表格', value: 'table' },
  { label: '其他', value: 'other' }
]

// JSON编辑器的数据
const jsonEditorContent = ref('[]')
const isValidJson = ref(true)

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

// 获取内容列表
const getContentData = async () => {
  loading.value = true
  
  try {
    const response = await getContentList({
      page: currentPage.value,
      limit: pageSize.value,
      keyword: searchKeyword.value
    })
    
    if (response && typeof response === 'object') {
      // 处理不同格式的响应
      if ('data' in response && Array.isArray(response.data)) {
        tableData.value = response.data
        total.value = 'total' in response ? Number(response.total) : response.data.length
      } else if (Array.isArray(response)) {
        tableData.value = response
        total.value = response.length
      } else {
        tableData.value = []
        total.value = 0
      }
    }
  } catch (error) {
    console.error('获取内容列表失败:', error)
    ElMessage.error('获取内容列表失败，请检查网络连接或稍后再试')
    tableData.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 获取所有标签
const fetchAllLabels = async () => {
  labelLoading.value = true
  try {
    const response = await getAllLabels()
    let list: any[] = []
    
    // 增强数据解析逻辑，适应多种后端响应格式
    if (Array.isArray(response)) {
      list = response
    } else if (response && typeof response === 'object') {
      if (Array.isArray((response as any).data)) {
        list = (response as any).data
      } else if (response.data && Array.isArray(response.data.data)) {
        list = response.data.data
      } else if (response.data && Array.isArray(response.data)) {
        list = response.data
      }
    }
    
    allLabels.value = list.map(item => ({
      id: item.id,
      name: item.name,
      color: item.color || '#409EFF'
    }))
  } catch (error) {
    console.error('获取标签列表失败:', error)
    allLabels.value = []
  } finally {
    labelLoading.value = false
  }
}

// 处理页面变化
const handleCurrentChange = (val: number) => {
  currentPage.value = val
  getContentData()
}

// 处理每页数量变化
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  getContentData()
}

// 处理搜索
const handleSearch = () => {
  currentPage.value = 1
  getContentData()
}

// 重置搜索
const resetSearch = () => {
  searchKeyword.value = ''
  currentPage.value = 1
  getContentData()
}

// 打开添加对话框
const openAddDialog = () => {
  editMode.value = false
  currentId.value = ''
  resetForm()
  dialogVisible.value = true
}

// 打开编辑对话框
const openEditDialog = async (row: Content) => {
  editMode.value = true
  currentId.value = row.id || ''
  resetForm()
  dialogVisible.value = true
  
  loading.value = true
  try {
    // 获取详细内容
    const contentDetail = await getContent(currentId.value)
    
    if (contentDetail) {
      const detailData = 'data' in contentDetail && contentDetail.data ? contentDetail.data : contentDetail
      
      form.title = detailData.title || ''
      form.content = detailData.content || ''
      form.content_type = detailData.content_type || 'text'
      form.is_published = detailData.is_published || false
      form.labels = detailData.labels || []
      
      // 如果内容类型是表格，尝试解析JSON
      if (form.content_type === 'table') {
        try {
          const jsonData = JSON.parse(form.content)
          jsonEditorContent.value = JSON.stringify(jsonData, null, 2)
          isValidJson.value = true
        } catch (e) {
          jsonEditorContent.value = form.content
          isValidJson.value = false
          ElMessage.warning('表格数据JSON格式不正确，请修正')
        }
      }
    }
  } catch (error) {
    console.error('获取内容详情失败:', error)
    ElMessage.error('获取内容详情失败，请检查网络连接或稍后再试')
    dialogVisible.value = false
  } finally {
    loading.value = false
  }
}

// 关闭对话框
const closeDialog = () => {
  dialogVisible.value = false
  resetForm()
}

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  
  form.title = ''
  form.content = ''
  form.content_type = 'text'
  form.is_published = false
  form.labels = []
  jsonEditorContent.value = '[]'
  isValidJson.value = true
}

// 监听内容类型变化
const handleContentTypeChange = (val: string) => {
  if (val === 'table') {
    // 初始化JSON编辑器内容
    if (form.content && form.content.trim() !== '') {
      try {
        const jsonData = JSON.parse(form.content)
        jsonEditorContent.value = JSON.stringify(jsonData, null, 2)
        isValidJson.value = true
      } catch (e) {
        jsonEditorContent.value = '[]'
        isValidJson.value = true
      }
    } else {
      jsonEditorContent.value = '[]'
    }
  }
}

// 监听JSON编辑器内容变化
watch(jsonEditorContent, (newVal) => {
  if (form.content_type === 'table') {
    validateJson()
  }
}, { deep: true })

// 验证JSON格式
const validateJson = () => {
  try {
    if (jsonEditorContent.value.trim() === '') {
      jsonEditorContent.value = '[]'
    }
    
    JSON.parse(jsonEditorContent.value)
    isValidJson.value = true
    form.content = jsonEditorContent.value
    return true
  } catch (e) {
    isValidJson.value = false
    ElMessage.error('JSON格式不正确，请修正')
    return false
  }
}

// 提交表单
const submitForm = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  
  // 如果是表格类型，验证JSON
  if (form.content_type === 'table' && !validateJson()) {
    return
  }
  
  // 更新表格内容
  if (form.content_type === 'table') {
    form.content = jsonEditorContent.value
  }
  
  await formEl.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      
      try {
        if (editMode.value && currentId.value) {
          // 更新内容
          await updateContent(currentId.value, form)
          ElMessage.success('内容更新成功')
        } else {
          // 创建内容
          await createContent(form)
          ElMessage.success('内容创建成功')
        }
        
        dialogVisible.value = false
        getContentData()
      } catch (error) {
        console.error('保存内容失败:', error)
        ElMessage.error('保存内容失败，请检查网络连接或稍后再试')
      } finally {
        submitting.value = false
      }
    }
  })
}

// 删除内容
const handleDelete = (row: Content) => {
  ElMessageBox.confirm('确定要删除该内容吗？此操作不可恢复！', '警告', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    loading.value = true
    
    try {
      await deleteContent(row.id || '')
      ElMessage.success('内容删除成功')
      
      // 如果当前页只有一条数据且不是第一页，则返回上一页
      if (tableData.value.length === 1 && currentPage.value > 1) {
        currentPage.value--
      }
      
      getContentData()
    } catch (error) {
      console.error('删除内容失败:', error)
      ElMessage.error('删除内容失败，请检查网络连接或稍后再试')
    } finally {
      loading.value = false
    }
  }).catch(() => {
    // 取消删除操作
  })
}

// 查看内容详情
const handleView = (row: Content) => {
  ElMessageBox.alert(row.content, row.title, {
    dangerouslyUseHTMLString: row.content_type === 'text' ? false : true,
    confirmButtonText: '确定',
    customClass: row.content_type === 'code' ? 'code-preview-dialog' : ''
  })
}

// 切换发布状态
const togglePublished = async (row: Content) => {
  loading.value = true
  
  try {
    const updateData: ContentParams = {
      title: row.title,
      content: row.content,
      content_type: row.content_type,
      is_published: !row.is_published,
      labels: row.labels || []
    }
    
    await updateContent(row.id || '', updateData)
    ElMessage.success(`内容${updateData.is_published ? '发布' : '取消发布'}成功`)
    getContentData()
  } catch (error) {
    console.error('更新发布状态失败:', error)
    ElMessage.error('更新发布状态失败，请检查网络连接或稍后再试')
  } finally {
    loading.value = false
  }
}

// 获取内容类型标签
const getContentTypeLabel = (type: string): string => {
  const option = contentTypeOptions.find(item => item.value === type)
  return option ? option.label : type
}

// 初始化
onMounted(() => {
  getContentData()
  fetchAllLabels()
})
</script>

<template>
  <div class="content-management">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>内容管理</span>
          <el-button type="primary" @click="openAddDialog">
            <el-icon><Plus /></el-icon> 添加内容
          </el-button>
        </div>
      </template>
      
      <!-- 搜索区域 -->
      <div class="search-container">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索标题或内容"
          class="search-input"
          clearable
          @clear="resetSearch"
        >
          <template #append>
            <el-button @click="handleSearch">
              <el-icon><Search /></el-icon>
            </el-button>
          </template>
        </el-input>
      </div>
      
      <!-- 内容表格 -->
      <div class="table-container">
        <el-table
          v-loading="loading"
          :data="tableData"
          style="width: 100%"
          border
          :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
          :row-class-name="() => 'table-row'"
        >
          <el-table-column prop="title" label="标题" min-width="160">
            <template #default="{ row }">
              <div class="title-cell">
                <el-tooltip :content="row.title" placement="top" :show-after="500">
                  <span class="ellipsis">{{ row.title }}</span>
                </el-tooltip>
                <div class="content-badges">
                  <el-tag size="small" :type="row.is_published ? 'success' : 'info'">
                    {{ row.is_published ? '已发布' : '未发布' }}
                  </el-tag>
                  <el-tag size="small" type="primary">
                    {{ getContentTypeLabel(row.content_type) }}
                  </el-tag>
                </div>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="content" label="内容预览" min-width="180">
            <template #default="{ row }">
              <div class="content-preview">
                <template v-if="row.content_type === 'image'">
                  <el-image
                    :src="row.content"
                    :preview-src-list="[row.content]"
                    fit="cover"
                    class="preview-image"
                  >
                    <template #error>
                      <div class="image-error">
                        <el-icon><Picture /></el-icon>
                        <span>图片预览失败</span>
                      </div>
                    </template>
                  </el-image>
                </template>
                <template v-else-if="row.content_type === 'code'">
                  <div class="code-preview">
                    <el-tooltip content="查看完整代码" placement="top">
                      <el-button link @click="handleView(row)">
                        <el-icon><View /></el-icon> 查看代码
                      </el-button>
                    </el-tooltip>
                  </div>
                </template>
                <template v-else-if="row.content_type === 'table'">
                  <div class="table-preview">
                    <el-tooltip content="查看完整表格" placement="top">
                      <el-button link @click="handleView(row)">
                        <el-icon><Grid /></el-icon> 查看表格
                      </el-button>
                    </el-tooltip>
                  </div>
                </template>
                <template v-else>
                  <el-tooltip :content="row.content" placement="top" :show-after="500">
                    <div class="content-text ellipsis">{{ row.content }}</div>
                  </el-tooltip>
                </template>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="标签" min-width="120">
            <template #default="{ row }">
              <div class="labels-container">
                <el-tag 
                  v-for="(label, index) in row.labels" 
                  :key="index"
                  size="small"
                  class="label-tag"
                >
                  {{ label }}
                </el-tag>
                <span v-if="!row.labels || row.labels.length === 0" class="no-labels">无标签</span>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="createAt" label="创建时间" min-width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.createAt) }}
            </template>
          </el-table-column>
          
          <el-table-column prop="updateAt" label="更新时间" min-width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.updateAt) }}
            </template>
          </el-table-column>
          
          <el-table-column fixed="right" label="操作" min-width="200">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button size="small" type="primary" @click="openEditDialog(row)">
                  <el-icon><Edit /></el-icon> 编辑
                </el-button>
                <el-button size="small" @click="handleView(row)">
                  <el-icon><View /></el-icon> 查看
                </el-button>
                <el-dropdown trigger="click" class="action-dropdown">
                  <el-button size="small" type="info">
                    更多 <el-icon><ArrowDown /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="togglePublished(row)">
                        <el-icon :class="row.is_published ? 'text-warning' : 'text-success'">
                          <component :is="row.is_published ? 'Hide' : 'Show'" />
                        </el-icon>
                        {{ row.is_published ? '取消发布' : '发布' }}
                      </el-dropdown-item>
                      <el-dropdown-item @click="handleDelete(row)" class="text-danger">
                        <el-icon class="text-danger"><Delete /></el-icon> 删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
          </el-table-column>
          
          <template #empty>
            <el-empty description="暂无内容数据" />
          </template>
        </el-table>
        
        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="total"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
            background
          />
        </div>
      </div>
      
      <!-- 添加/编辑对话框 -->
      <el-dialog
        v-model="dialogVisible"
        :title="editMode ? '编辑内容' : '添加内容'"
        width="70%"
        :close-on-click-modal="false"
        @close="closeDialog"
        destroy-on-close
      >
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
        >
          <el-form-item label="标题" prop="title">
            <el-input v-model="form.title" placeholder="请输入标题" />
          </el-form-item>
          
          <el-form-item label="内容类型" prop="content_type">
            <el-select v-model="form.content_type" placeholder="请选择内容类型" @change="handleContentTypeChange">
              <el-option
                v-for="item in contentTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="内容" prop="content">
            <!-- 文本内容 -->
            <template v-if="form.content_type === 'text'">
              <el-input
                v-model="form.content"
                type="textarea"
                :rows="10"
                placeholder="请输入文本内容"
              />
            </template>
            
            <!-- 图片内容 -->
            <template v-else-if="form.content_type === 'image'">
              <el-input v-model="form.content" placeholder="请输入图片URL" />
              <div v-if="form.content" class="image-preview">
                <el-image
                  :src="form.content"
                  fit="cover"
                  style="max-width: 100%; max-height: 300px"
                >
                  <template #error>
                    <div class="image-error">
                      <el-icon><Picture /></el-icon>
                      <span>图片预览失败</span>
                    </div>
                  </template>
                </el-image>
              </div>
            </template>
            
            <!-- 代码内容 -->
            <template v-else-if="form.content_type === 'code'">
              <el-input
                v-model="form.content"
                type="textarea"
                :rows="15"
                placeholder="请输入代码内容"
                class="code-input"
                font-family="monospace"
              />
            </template>
            
            <!-- 表格内容（JSON格式） -->
            <template v-else-if="form.content_type === 'table'">
              <div class="json-editor-container">
                <div class="json-editor-header">
                  <span>JSON编辑器</span>
                  <el-tag :type="isValidJson ? 'success' : 'danger'" size="small">
                    {{ isValidJson ? 'JSON格式有效' : 'JSON格式错误' }}
                  </el-tag>
                </div>
                <el-input
                  v-model="jsonEditorContent"
                  type="textarea"
                  :rows="15"
                  placeholder="请输入JSON格式的表格数据"
                  class="json-editor"
                  @blur="validateJson"
                  font-family="monospace"
                />
                <div class="json-editor-tips">
                  <el-alert
                    title="表格数据须为有效的JSON格式"
                    type="info"
                    description="支持数组和对象格式，例如: [{&quot;name&quot;: &quot;张三&quot;, &quot;age&quot;: 20}, {&quot;name&quot;: &quot;李四&quot;, &quot;age&quot;: 30}]"
                    show-icon
                    :closable="false"
                  />
                </div>
              </div>
            </template>
            
            <!-- 其他内容 -->
            <template v-else>
              <el-input
                v-model="form.content"
                type="textarea"
                :rows="10"
                placeholder="请输入内容"
              />
            </template>
          </el-form-item>
          
          <el-form-item label="发布状态">
            <el-switch v-model="form.is_published" />
          </el-form-item>
          
          <el-form-item label="标签">
            <el-select
              v-model="form.labels"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="请选择标签（可创建）"
              :loading="labelLoading"
            >
              <el-option
                v-for="label in allLabels"
                :key="label.id || ''"
                :label="label.name"
                :value="label.name"
              />
            </el-select>
          </el-form-item>
        </el-form>
        
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="closeDialog">取消</el-button>
            <el-button type="primary" @click="submitForm(formRef)" :loading="submitting">
              {{ editMode ? '更新' : '创建' }}
            </el-button>
          </span>
        </template>
      </el-dialog>
    </el-card>
  </div>
</template>

<style scoped>
.content-management {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-container {
  margin-bottom: 20px;
}

.search-input {
  max-width: 400px;
}

.table-container {
  margin-top: 20px;
  overflow-x: auto;
}

.table-row {
  transition: background-color 0.2s;
}

.table-row:hover {
  background-color: #f5f7fa;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.title-cell {
  display: flex;
  flex-direction: column;
}

.content-badges {
  display: flex;
  gap: 5px;
  margin-top: 5px;
}

.ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.content-text {
  max-height: 60px;
  overflow: hidden;
}

.content-preview {
  padding: 5px 0;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.preview-image {
  width: 80px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
}

.image-preview {
  margin-top: 10px;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  justify-content: center;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60px;
  width: 80px;
  background-color: #f5f7fa;
  color: #909399;
}

.code-preview,
.table-preview {
  display: flex;
  align-items: center;
}

.code-input,
.json-editor {
  font-family: monospace;
}

.json-editor-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.json-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.json-editor-tips {
  margin-top: 10px;
}

.labels-container {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.label-tag {
  margin-right: 5px;
  margin-bottom: 5px;
}

.no-labels {
  color: #909399;
  font-size: 12px;
}

.action-dropdown {
  margin-left: 5px;
}

.text-success {
  color: #67c23a;
}

.text-warning {
  color: #e6a23c;
}

.text-danger {
  color: #f56c6c;
}

@media screen and (max-width: 768px) {
  .action-buttons {
    flex-direction: column;
  }
  
  .search-input {
    max-width: 100%;
  }
  
  .pagination-container {
    overflow-x: auto;
  }
}

/* 代码预览对话框样式 */
:deep(.code-preview-dialog .el-message-box__content) {
  padding: 20px;
  background-color: #f8f9fa;
  font-family: monospace;
  white-space: pre-wrap;
  overflow: auto;
  max-height: 70vh;
}
</style>
