// 内容相关的API接口
import request from './request'

// 内容接口类型
export interface Content {
  id?: string
  title: string
  content: string
  content_type: 'text' | 'image' | 'code' | 'table' | 'other'
  is_published: boolean
  labels?: string[]
  createAt?: string
  updateAt?: string
}

// 内容参数类型
export interface ContentParams {
  title: string
  content: string
  content_type: 'text' | 'image' | 'code' | 'table' | 'other'
  is_published: boolean
  labels?: string[]
}

// 查询参数类型
export interface ContentQueryParams {
  page?: number
  limit?: number
  keyword?: string
}

// ===== 工具函数：前端 <-> 后端 数据结构转换 =====

// 将前端的 ContentParams 转换为后端接口需要的 payload
export const toBackendPayload = (data: ContentParams) => {
  const payload: Record<string, any> = {}
  switch (data.content_type) {
    case 'text':
      payload.text = data.content
      break
    case 'image':
      payload.image = data.content
      break
    case 'code':
      payload.code = data.content
      break
    case 'table':
      try {
        payload.table = JSON.parse(data.content)
      } catch (e) {
        payload.table = data.content // 让后端自己决定
      }
      break
    case 'other':
    default:
      payload.file = data.content
  }
  return payload
}

// 将后端返回的单条内容转换为前端可用的 Content 结构
export const fromBackendItem = (item: any): Content => {
  let content_type: Content['content_type'] = 'other'
  let content = ''
  if (item.text !== undefined) {
    content_type = 'text'
    content = item.text
  } else if (item.image !== undefined) {
    content_type = 'image'
    content = item.image
  } else if (item.code !== undefined) {
    content_type = 'code'
    content = item.code
  } else if (item.table !== undefined) {
    content_type = 'table'
    content = Array.isArray(item.table) ? JSON.stringify(item.table) : item.table
  } else if (item.file !== undefined) {
    content_type = 'other'
    content = item.file
  }

  return {
    id: item.id?.toString?.() || '',
    title: item.title || '', // 如果后端没有 title，保持空
    content,
    content_type,
    is_published: !!item.is_published,
    labels: item.labels || [],
    createAt: item.createAt,
    updateAt: item.updateAt
  }
}

// ============ 修改 API 调用 ============

// 获取内容列表，自动转换为前端结构
export const getContentList = async (params?: ContentQueryParams) => {
  const res = await request({
    url: '/content',
    method: 'GET',
    params
  })

  // 根据后端返回的结构转换
  if (Array.isArray(res)) {
    return res.map(fromBackendItem)
  }
  if (res && typeof res === 'object' && Array.isArray(res.data)) {
    return {
      ...res,
      data: res.data.map(fromBackendItem)
    }
  }
  return res
}

// 获取单个内容
export const getContent = (id: string) => {
  return request({
    url: `/content/${id}`,
    method: 'GET'
  })
}

// 创建内容
export const createContent = (data: ContentParams) => {
  const payload = toBackendPayload(data)
  return request({
    url: '/content',
    method: 'POST',
    data: payload
  })
}

// 更新内容
export const updateContent = (id: string, data: ContentParams) => {
  const payload = toBackendPayload(data)
  return request({
    url: `/content/${id}`,
    method: 'PUT',
    data: payload
  })
}

// 删除内容
export const deleteContent = (id: string) => {
  return request({
    url: `/content/${id}`,
    method: 'DELETE'
  })
} 