// 管理员相关的API接口
import request from './request'

// 用户管理接口
// 查询所有用户
export function getAllUsers() {
  return request({
    url: '/users',
    method: 'get'
  })
}

// 查询单个用户
export function getUserById(id: number | string) {
  return request({
    url: `/users/${id}`,
    method: 'get'
  }).then((response: any) => {
    // 确保返回的是一个对象，包含username属性
    return response && typeof response === 'object' ? response : { username: `user-${id}` }
  })
}

// 修改用户密码
export function updateUserPassword(data: { userId?: number, oldPassword: string, newPassword: string }) {
  // 根据API文档，密码修改路径为 /users/password
  return request({
    url: '/users/password',
    method: 'put',
    data: {
      oldPassword: data.oldPassword,
      newPassword: data.newPassword
    }
  })
}

// 直接重置用户密码（不需要验证旧密码）
export function resetUserPassword(username: string, newPassword: string) {
  return request({
    url: `/users/reset-password/${username}`,
    method: 'put',
    data: {
      newPassword
    }
  })
}

// 修改用户昵称
export function updateUserNickname(userId: number | string, nickname: string) {
  return request({
    url: `/users/${userId}/nickname`,
    method: 'put',
    data: {
      nickname
    }
  })
}

// 删除用户
export function deleteUser(id: number | string) {
  return request({
    url: `/users/${id}`,
    method: 'delete'
  })
}

// 修改注册码
export function updateRegisterCode(data: { oldCode: string, newCode: string }) {
  return request({
    url: '/register-code',
    method: 'put',
    data
  })
}

// 文章管理接口
// 查询所有文章
export function getAllArticles(params?: {
  title?: string;
  label?: string;
  startDate?: string;
  endDate?: string;
}) {
  return request({
    url: '/article',
    method: 'get',
    params,
    headers: {
      'Content-Type': 'application/json'
    }
  }).catch(error => {
    console.error('获取文章列表失败', error);
    throw error;
  });
}

// 获取单个文章
export function getArticleById(id: number | string) {
  return request({
    url: `/article/${id}`,
    method: 'get',
    headers: {
      'Content-Type': 'application/json'
    }
  }).catch(error => {
    console.error(`获取文章ID:${id}失败`, error);
    throw error;
  });
}

// 创建文章
export interface ArticleContent {
  text: string;
  image?: string;
  code?: string;
  table?: Array<Record<string, any>>;
  file?: string;
}

export interface ArticleData {
  title: string;
  label: { name: string };
  content: ArticleContent;
}

export function createArticle(data: ArticleData) {
  return request({
    url: '/article',
    method: 'post',
    data,
    headers: {
      'Content-Type': 'application/json'
    }
  }).catch(error => {
    console.error('创建文章失败', error);
    throw error;
  });
}

// 更新文章
export function updateArticle(id: number | string, data: ArticleData) {
  return request({
    url: `/article/${id}`,
    method: 'put',
    data,
    headers: {
      'Content-Type': 'application/json'
    }
  }).catch(error => {
    console.error(`更新文章ID:${id}失败`, error);
    throw error;
  });
}

// 删除文章
export function deleteArticle(id: number | string) {
  return request({
    url: `/article/${id}`,
    method: 'delete',
    headers: {
      'Content-Type': 'application/json'
    }
  }).catch(error => {
    console.error(`删除文章ID:${id}失败`, error);
    throw error;
  });
} 