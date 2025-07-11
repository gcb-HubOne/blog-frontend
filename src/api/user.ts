// 用户相关的API接口
import type { AxiosResponse } from 'axios'
import request from './request'

// 接口返回类型
interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
}

// 用户登录参数
interface LoginParams {
  username: string
  password: string
}

// 用户登录响应
interface LoginResponse {
  token: string
  nickname?: string
}

// 用户注册参数
interface RegisterParams {
  username: string
  nickname: string
  password: string
  code: string
}

// 登录接口
export function login(data: LoginParams): Promise<ApiResponse<LoginResponse> | LoginResponse> {
  return request({
    url: '/login',
    method: 'post',
    data
  })
}

// 注册接口
export function register(data: RegisterParams): Promise<ApiResponse<null>> {
  return request({
    url: '/register',
    method: 'post',
    data
  })
}

// 获取用户信息
export function getUserInfo(): Promise<ApiResponse<{ username: string, nickname: string, role: string }>> {
  return request({
    url: '/user/info',
    method: 'get'
  })
}

// 退出登录
export function logout(): Promise<ApiResponse<null>> {
  return request({
    url: '/logout',
    method: 'post'
  })
} 