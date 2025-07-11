// API模块入口文件
// 导出所有API模块

// 导出用户相关API
export * as user from './user'

// 导出管理员相关API
export * as admin from './admin'

// 导出请求工具
export { default as request } from './request'

// 扩展: 可以在这里添加更多的API模块
// export * as article from './article'
// export * as category from './category'
// 等等... 