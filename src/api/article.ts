// 文章相关的API接口
import request from './request'

// 文章接口类型
export interface Article {
  id: string
  title: string
  content: string
  cover?: string
  labels?: string
  is_published: boolean
  createTime?: string
  updateTime?: string
}

// 文章参数类型
export interface ArticleParams {
  title: string
  content: string
  cover?: string
  labels?: string
  is_published?: boolean
}

// 查询参数类型
export interface ArticleQueryParams {
  page?: number
  limit?: number
  keyword?: string
  title?: string
  label?: string
  startDate?: string
  endDate?: string
  is_published?: boolean
}

// 获取文章列表
export const getArticleList = (params?: ArticleQueryParams) => {
  return request({
    url: '/article',
    method: 'GET',
    params
  })
}

// 获取单个文章
export const getArticle = (id: string) => {
  return request({
    url: `/article/${id}`,
    method: 'GET'
  })
}

// 创建文章
export const createArticle = (data: ArticleParams) => {
  return request({
    url: '/article',
    method: 'POST',
    data
  })
}

// 更新文章
export const updateArticle = (id: string, data: ArticleParams) => {
  return request({
    url: `/article/${id}`,
    method: 'PUT',
    data
  })
}

// 删除文章
export const deleteArticle = (id: string) => {
  return request({
    url: `/article/${id}`,
    method: 'DELETE'
  })
} 