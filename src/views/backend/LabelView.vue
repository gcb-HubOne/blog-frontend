<script lang="ts" setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { getLabelList, getLabel, createLabel, updateLabel, deleteLabel, generateRandomColor } from '../../api/label'
import type { Label, LabelParams } from '../../api/label'
import { Search, Plus, Edit, Delete, Refresh } from '@element-plus/icons-vue'

// 状态控制
const loading = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const dialogVisible = ref(false)
const editMode = ref(false)
const currentId = ref('')

// 表单数据
const form = reactive<LabelParams>({
  name: '',
  color: ''
})

// 表单验证规则
const rules = reactive<FormRules>({
  name: [
    { required: true, message: '请输入标签名称', trigger: 'blur' },
    { min: 1, max: 20, message: '长度在1到20个字符之间', trigger: 'blur' }
  ]
})

// 表格数据
const tableData = ref<Label[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

// 搜索关键词
const searchKeyword = ref('')

// computed filtered data
const filteredTableData = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return tableData.value
  return tableData.value.filter(l => (l.name || '').toLowerCase().includes(kw))
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

// 获取标签列表
const getLabelData = async () => {
  loading.value = true
  
  try {
    const kw = searchKeyword.value.trim()
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      ...(kw ? { keyword: kw, name: kw } : {})
    }
    
    const response = await getLabelList(params)
    
    // 增强数据解析逻辑，适应多种后端响应格式
    let list: any[] = []
    if (Array.isArray(response)) {
      list = response
      total.value = response.length
    } else if (response && typeof response === 'object') {
      if (Array.isArray((response as any).data)) {
        list = (response as any).data
        total.value = 'total' in response ? Number(response.total) : response.data.length
      } else if (response.data && Array.isArray(response.data.data)) {
        list = response.data.data
        total.value = response.data.total || list.length
      } else if (response.data && Array.isArray(response.data)) {
        list = response.data
        total.value = 'total' in response ? Number(response.total) : list.length
      } else {
        list = []
        total.value = 0
      }
    } else {
      list = []
      total.value = 0
    }
    
    // 确保每个标签都有颜色属性
    tableData.value = list.map(item => ({
      ...item,
      color: item.color || generateRandomColor()
    }))
  } catch (error) {
    console.error('获取标签列表失败:', error)
    ElMessage.error('获取标签列表失败，请检查网络连接或稍后再试')
    tableData.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 处理页面变化
const handleCurrentChange = (val: number) => {
  currentPage.value = val
  getLabelData()
}

// 处理每页数量变化
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  getLabelData()
}

// 处理搜索
const handleSearch = () => {
  console.log('Handling search with keyword:', searchKeyword.value);
  currentPage.value = 1
  getLabelData()
}

// 重置搜索
const resetSearch = () => {
  searchKeyword.value = ''
  currentPage.value = 1
  getLabelData()
}

// 打开添加对话框
const openAddDialog = () => {
  editMode.value = false
  currentId.value = ''
  resetForm()
  // 确保新标签有默认颜色
  form.color = generateRandomColor()
  console.log('Opening add dialog with color:', form.color)
  dialogVisible.value = true
}

// 打开编辑对话框
const openEditDialog = async (row: Label) => {
  editMode.value = true
  currentId.value = row.id || ''
  resetForm()
  
  loading.value = true
  try {
    // 获取详细标签
    const labelDetail = await getLabel(currentId.value)
    
    if (labelDetail) {
      const detailData = 'data' in labelDetail && labelDetail.data ? labelDetail.data : labelDetail
      
      form.name = detailData.name || ''
      // 确保编辑时的颜色字段有值
      form.color = detailData.color || generateRandomColor()
      console.log('Editing label with color:', form.color)
    }
  } catch (error) {
    console.error('获取标签详情失败:', error)
    ElMessage.error('获取标签详情失败，请检查网络连接或稍后再试')
    dialogVisible.value = false
  } finally {
    loading.value = false
  }
  
  dialogVisible.value = true
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
  
  form.name = ''
  form.color = ''
}

// 提交表单
const submitForm = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  
  await formEl.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      
      try {
        // 确保颜色不为空
        if (!form.color) {
          form.color = generateRandomColor()
        }
        
        console.log('Submitting form with color:', form.color)
        
        if (editMode.value && currentId.value) {
          // 更新标签
          await updateLabel(currentId.value, form)
          ElMessage.success('标签更新成功')
        } else {
          // 创建标签
          await createLabel(form)
          ElMessage.success('标签创建成功')
        }
        
        dialogVisible.value = false
        getLabelData()
      } catch (error) {
        console.error('保存标签失败:', error)
        ElMessage.error('保存标签失败，请检查网络连接或稍后再试')
      } finally {
        submitting.value = false
      }
    }
  })
}

// 删除标签
const handleDelete = (row: Label) => {
  ElMessageBox.confirm('确定要删除该标签吗？此操作不可恢复！', '警告', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    loading.value = true
    
    try {
      await deleteLabel(row.id || '')
      ElMessage.success('标签删除成功')
      
      // 如果当前页只有一条数据且不是第一页，则返回上一页
      if (tableData.value.length === 1 && currentPage.value > 1) {
        currentPage.value--
      }
      
      getLabelData()
    } catch (error) {
      console.error('删除标签失败:', error)
      ElMessage.error('删除标签失败，请检查网络连接或稍后再试')
    } finally {
      loading.value = false
    }
  }).catch(() => {
    // 取消删除操作
  })
}

// 生成随机颜色
const handleRandomColor = () => {
  form.color = generateRandomColor()
}

// 监听颜色变化
watch(() => form.color, (newVal) => {
  console.log('Color changed:', newVal);
})

// 初始化
onMounted(() => {
  getLabelData()
})
</script>

<template>
  <div class="label-management">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span class="page-title">标签管理</span>
          <el-button type="primary" @click="openAddDialog">
            <el-icon><Plus /></el-icon> 添加标签
          </el-button>
        </div>
      </template>
      
      <!-- 搜索区域 -->
      <div class="search-section">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索标签名称"
          class="search-input"
          clearable
          @clear="resetSearch"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" @click="handleSearch" class="search-button">
          搜索
        </el-button>
        <el-button @click="resetSearch">
          重置
        </el-button>
      </div>
      
      <!-- 标签表格 -->
      <div class="table-container">
        <el-table
          v-loading="loading"
          :data="filteredTableData"
          style="width: 100%"
          border
          :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
          :row-class-name="() => 'table-row'"
        >
          <el-table-column prop="name" label="标签名称" min-width="180">
            <template #default="{ row }">
              <div class="tag-item">
                <el-tag
                  :style="{ backgroundColor: row.color || '#409EFF', color: '#ffffff' }"
                  class="tag-preview"
                >
                  {{ row.name }}
                </el-tag>
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
          
          <el-table-column fixed="right" label="操作" width="200">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button size="small" type="primary" @click="openEditDialog(row)" class="action-button">
                  <el-icon><Edit /></el-icon> 编辑
                </el-button>
                <el-button size="small" type="danger" @click="handleDelete(row)" class="action-button">
                  <el-icon><Delete /></el-icon> 删除
                </el-button>
              </div>
            </template>
          </el-table-column>
          
          <template #empty>
            <el-empty description="暂无标签数据" />
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
        :title="editMode ? '编辑标签' : '添加标签'"
        width="500px"
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
          <el-form-item label="标签名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入标签名称" />
          </el-form-item>
          
          <el-form-item label="标签颜色" required>
            <div class="color-selector">
              <div class="color-picker-row">
                <el-color-picker v-model="form.color" show-alpha class="color-picker" />
                <el-button size="default" @click="handleRandomColor" class="random-color-button">
                  <el-icon><Refresh /></el-icon> 随机颜色
                </el-button>
              </div>
              
              <div class="color-preview-section">
                <div class="color-preview-large" :style="{ backgroundColor: form.color || '#409EFF' }"></div>
                <div class="color-code">{{ form.color || '#409EFF' }}</div>
              </div>
              
              <div class="tag-preview-container">
                <span>预览效果：</span>
                <el-tag :style="{ backgroundColor: form.color || '#409EFF', color: '#ffffff' }">
                  {{ form.name || '标签预览' }}
                </el-tag>
              </div>
            </div>
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
.label-management {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.search-section {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.search-input {
  max-width: 300px;
  min-width: 200px;
}

.search-button {
  white-space: nowrap;
}

.table-container {
  margin-top: 20px;
  overflow-x: auto;
  background-color: #ffffff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
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
  padding: 10px 0;
}

.tag-item {
  display: flex;
  align-items: center;
}

.tag-preview {
  margin-right: 10px;
  padding: 0 10px;
}

.color-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-preview {
  display: inline-block;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
}

.color-value {
  font-size: 12px;
  color: #606266;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.action-button {
  white-space: nowrap;
}

.color-selector {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.color-picker-row {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.random-color-button {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.color-preview-section {
  display: flex;
  align-items: center;
  gap: 15px;
  margin: 10px 0;
}

.color-preview-large {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
  transition: all 0.3s;
}

.color-code {
  font-size: 14px;
  font-family: monospace;
  color: #606266;
  background-color: #f5f7fa;
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.tag-preview-container {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 15px;
  padding: 10px;
  background-color: #ffffff;
  border-radius: 4px;
  border: 1px dashed #dcdfe6;
}

@media screen and (max-width: 768px) {
  .search-section {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .search-input {
    max-width: 100%;
    width: 100%;
    margin-bottom: 10px;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 5px;
  }
  
  .pagination-container {
    overflow-x: auto;
    justify-content: flex-start;
    padding: 10px;
  }
  
  .color-picker-row {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .color-preview-section {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .tag-preview-container {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .random-color-button {
    margin-top: 10px;
    margin-left: 0;
  }
}
</style>
