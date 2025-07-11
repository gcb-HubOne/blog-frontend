// 标签相关的API接口
import request from './request'

// 标签接口类型
export interface Label {
  id?: string
  name: string
  color?: string
  count?: number
  createAt?: string
  updateAt?: string
}

// 标签参数类型
export interface LabelParams {
  name: string
  color?: string
}

// 查询参数类型
export interface LabelQueryParams {
  page?: number
  limit?: number
  keyword?: string
}

// 获取标签列表
export const getLabelList = (params?: LabelQueryParams) => {
  return request({
    url: '/label',
    method: 'GET',
    params
  })
}

// 获取单个标签
export const getLabel = (id: string) => {
  return request({
    url: `/label/${id}`,
    method: 'GET'
  })
}

// 创建标签
export const createLabel = (data: LabelParams) => {
  // 确保颜色字段有值
  if (!data.color) {
    data.color = generateRandomColor();
  }
  
  return request({
    url: '/label',
    method: 'POST',
    data
  })
}

// 更新标签
export const updateLabel = (id: string, data: LabelParams) => {
  // 确保颜色字段有值
  if (!data.color) {
    data.color = generateRandomColor();
  }
  
  return request({
    url: `/label/${id}`,
    method: 'PUT',
    data
  })
}

// 删除标签
export const deleteLabel = (id: string) => {
  return request({
    url: `/label/${id}`,
    method: 'DELETE'
  })
}

// 获取所有标签（不分页）
export const getAllLabels = () => {
  return request({
    url: '/label',
    method: 'GET'
  })
}

// 随机生成标签颜色
export const generateRandomColor = (): string => {
  const colors = [
    '#409EFF', // 蓝色
    '#67C23A', // 绿色
    '#E6A23C', // 黄色
    '#F56C6C', // 红色
    '#909399', // 灰色
    '#9370DB', // 紫色
    '#20B2AA', // 青色
    '#FF7F50', // 珊瑚色
    '#2E8B57', // 海绿色
    '#778899'  // 亮灰色
  ]
  return colors[Math.floor(Math.random() * colors.length)]
} 