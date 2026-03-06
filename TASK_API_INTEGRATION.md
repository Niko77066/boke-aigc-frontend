# Task: 接入外部视频上传 API

## 目标
将资产管理模块从 mock API 切换到真实后端 API（视频上传 + 状态轮询）。

## API 文档

### 基础信息
- 基础地址: `http://<服务器IP>:8060`（先用环境变量 `VITE_API_BASE_URL` 配置，默认 `http://localhost:8060`）
- 知识库 ID: `dataset_id=69a8017d268467777bda97d3`（固定）
- 无认证

### 接口一：上传视频
```
POST /api/external/upload-video
Content-Type: multipart/form-data
```

参数：
- `files` (File[]) — 视频文件流，支持多个文件同时上传（与 folder 二选一）
- `folder` (string) — 服务器本地文件夹绝对路径（与 files 二选一）
- `product_name` (string, 可选) — 产品名称，用于标签分类
- `folder_name` (string, 可选) — 自定义文件夹名
- `analyze_prompt` (string, 可选) — 自定义解析维度 Prompt

支持格式: .mp4 .avi .mov .mkv .wmv .flv .webm .m4v .3gp

成功响应:
```json
{
  "status": 200,
  "state": "processing",
  "message": "已上传 3 个视频，正在处理",
  "folder_id": 5,
  "video_count": 3
}
```

### 接口二：查询处理状态
```
GET /api/external/upload-status/{folder_id}
```

成功响应:
```json
{
  "status": 200,
  "state": "completed",
  "total": 3,
  "completed": 3,
  "failed": 0,
  "videos": [
    {
      "file_name": "产品介绍.mp4",
      "media_id": "abc123",
      "state": "completed"
    }
  ]
}
```

整体 state: `processing` | `completed` | `partial_failed`
视频 state: `pending` | `uploading` | `analyzing` | `uploading_kb` | `completed` | `failed`

## 需要修改的文件

### 1. 新建 `src/api/external.ts`
- 创建真实 API 调用层（axios 或 fetch）
- `uploadVideos(files: File[], options?)` → POST multipart/form-data
- `getUploadStatus(folderId: number)` → GET 轮询
- 基础 URL 从 `import.meta.env.VITE_API_BASE_URL` 读取

### 2. 修改 `src/api/index.ts`
- 新增 `export * as externalApi from './external'`
- 保留 mock API 作为 fallback

### 3. 修改 `src/stores/asset.ts`
- `uploadFiles()` 改为调用真实 API
- 上传后返回 `folder_id`，启动轮询 `getUploadStatus(folderId)`
- 轮询间隔 5 秒，直到 state 不是 `processing`
- 将 API 返回的视频信息映射为现有 `Asset` 类型
- 添加 error 处理

### 4. 修改 `src/views/AssetManagement.vue`
- 上传区域添加可选字段：`product_name`、`folder_name`、`analyze_prompt`
- 显示上传后的处理状态（processing → analyzing → completed）
- 显示每个视频的单独状态

### 5. 修改 `.env` 和 `.env.development`
- 添加 `VITE_API_BASE_URL=http://localhost:8060`

## 约束
- 保持 TypeScript 严格模式，零 `any`
- 保持现有 mock API 不删（可通过环境变量切换）
- `vite build` 和 `vue-tsc --noEmit` 必须零错误
- 不要修改 `vite.config.ts`
- scoped style 中如果用 Tailwind，需要 `@reference "tailwindcss";`
