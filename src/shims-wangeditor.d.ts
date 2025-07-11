declare module '@wangeditor/editor-for-vue' {
  import { Component } from 'vue'
  
  export const Editor: Component
  export const Toolbar: Component
}

declare module '@wangeditor/editor' {
  export const Boot: {
    registerModule: (module: any) => void
  }
}

declare module '@wangeditor/plugin-md' {
  const markdownModule: any
  export default markdownModule
} 