import axios from 'axios'
import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'

// 创建axios实例
const service = axios.create({
  baseURL: '/api', // 使用代理路径，通过Vite代理转发请求
  timeout: 10000, // 请求超时时间
  withCredentials: false // 跨域请求不需要携带cookie
})

// 请求拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 从localStorage中获取token
    const token = localStorage.getItem('token')
    if (token) {
      // 设置请求头的Authorization字段
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // 过滤掉空的查询参数
    if (config.params) {
      Object.keys(config.params).forEach(key => {
        if (config.params[key] === '' || config.params[key] === null || config.params[key] === undefined) {
          delete config.params[key];
        }
      });
    }
    
    return config
  },
  (error: any) => {

    return Promise.reject(error)
  }
)

// 解析错误信息的辅助函数
const parseErrorMessage = (error: any): string => {
  // 1. 首先检查响应数据中的具体错误信息
  if (error.response?.data) {
    // 处理NestJS的标准错误格式
    if (error.response.data.message) {
      if (Array.isArray(error.response.data.message)) {
        return error.response.data.message.join('; ');
      }
      return error.response.data.message;
    }
    
    // 处理其他可能的错误格式
    if (typeof error.response.data === 'string') {
      return error.response.data;
    }
    
    if (error.response.data.error) {
      return error.response.data.error;
    }
  }
  
  // 2. 根据状态码提供默认错误信息
  switch (error.response?.status) {
    case 400:
      return '请求参数错误';
    case 401:
      return '用户名或密码错误';
    case 403:
      return '没有权限访问此资源';
    case 404:
      return '请求的资源或接口不存在';
    case 500:
      return '服务器内部错误，请稍后再试';
    default:
      return error.message || '未知错误';
  }
};

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse) => {
    // 记录响应信息

    // 直接返回响应数据，由各个API模块自行处理
    return response.data
  },
  (error: any) => {
    // 记录详细错误信息，便于调试

    
    // 获取详细的错误信息
    const errorMsg = parseErrorMessage(error);
    
    // 处理CORS错误
    if (error.message && error.message.includes('Network Error')) {

      ElMessage.error('网络错误，请检查网络连接')
      return Promise.reject(error)
    }
    
    // 处理401错误 - 未授权，可能是token过期或用户名密码错误
    if (error.response?.status === 401) {
      const customMsg = error.response?.data?.message || '用户名或密码错误';
      ElMessage.error(customMsg)
      
      // 只有在token过期的情况下才清除缓存和重定向
      if (localStorage.getItem('token') && customMsg.includes('过期')) {
        localStorage.removeItem('token')
        localStorage.removeItem('username')
        window.location.href = '/register'
      }
      
      return Promise.reject(new Error(customMsg))
    }
    
    // 显示错误消息
    ElMessage.error(errorMsg)
    
    return Promise.reject(new Error(errorMsg))
  }
)

// 导出请求方法
export default service 