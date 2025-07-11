// 个人设置相关的API接口
import request from './request'

// 个人信息接口类型
export interface Profile {
  id?: string
  name: string
  email: string
  weixin: string
  desc_per: string
  work_exhibition: string
  createAt?: string
  updateAt?: string
}

// 个人信息参数类型
export interface ProfileParams {
  name: string
  email: string
  weixin: string
  desc_per: string
  work_exhibition: string
}

// 作品展示项类型
export interface WorkExhibitionItem {
  image: string
  description: string
}

// 注意: 函数已在文件末尾重新定义为JSON格式版本

// 获取个人信息
export const getProfile = () => {
  return request({
    url: '/profile',
    method: 'GET'
  })
}

// 创建个人信息
export const createProfile = (data: ProfileParams) => {
  return request({
    url: '/profile',
    method: 'POST',
    data
  })
}

// 更新个人信息
export const updateProfile = (data: ProfileParams) => {
  return request({
    url: '/profile',
    method: 'PUT',
    data
  })
}

// 删除个人信息
export const deleteProfile = () => {
  return request({
    url: '/profile',
    method: 'DELETE'
  })
}

// 将作品展示数组转换为字符串 (使用分号和竖线分隔符格式)
export const stringifyWorkExhibition = (works: WorkExhibitionItem[]): string => {
  if (!works || !works.length) return '';
  
  // 过滤掉空的图片链接
  const validWorks = works.filter(item => item.image && item.image.trim() !== '');
  
  // 使用竖线分隔图片和描述，使用分号分隔不同作品
  return validWorks.map(item => `${item.image}|${item.description || ''}`).join(';');
}

// 将作品展示字符串转换为数组 (从分号和竖线分隔符格式)
export const parseWorkExhibition = (workStr?: string): WorkExhibitionItem[] => {
  if (!workStr || workStr.trim() === '') return [];
  
  try {
    // 尝试先按JSON格式解析
    const parsed = JSON.parse(workStr);
    if (Array.isArray(parsed)) {
      return parsed.map(item => ({
        image: item.image || '',
        description: item.description || ''
      }));
    }
  } catch (error) {
    // 如果JSON解析失败，则按分号和竖线分隔符格式解析
    return workStr.split(';').map(item => {
      const parts = item.split('|');
      return {
        image: parts[0] || '',
        description: parts[1] || ''
      };
    });
  }
  
  return [];
} 