# cursor-gemini-proxy

部署在 Vercel 上的 OpenAI 兼容代理，将 Cursor 的请求转发到 Google Gemini API。

## 部署到 Vercel

1. 导入此仓库到 Vercel
2. 在项目 **Settings → Environment Variables** 中添加：

| 变量名 | 说明 |
|---|---|
| `GOOGLE_API_KEY` | Google Gemini API Key（必填） |
| `PROXY_API_KEY` | 自定义访问密码，防止他人滥用（推荐填写） |

3. 部署完成后，你的接口地址为：

```
https://your-project.vercel.app/api/v1
```

## Cursor 配置

在 Cursor **Settings → Models → OpenAI API Key** 处配置自定义 Provider：

- **Base URL**: `https://your-project.vercel.app/api/v1`
- **API Key**: 填写你在 Vercel 中设置的 `PROXY_API_KEY`（若未设置则随便填）

## 模型映射

| Cursor 选择的模型 | 实际调用的 Gemini 模型 | 定位 |
|---|---|---|
| `gpt-4o-mini` | `gemini-2.5-flash-lite` | 最便宜，日常对话 |
| `gpt-4o` | `gemini-3-flash` | 便宜，通用 |
| `gpt-4.1-mini` | `gemini-3.1-flash-lite-preview` | 便宜预览版 |
| `gpt-4.1` | `gemini-3-pro-preview` | 较贵，写代码 |
| `gpt-4.1-pro` | `gemini-3.1-pro-preview` | 最贵，最新写代码 |

默认回退模型：`gemini-3-flash`

补充规则：
- 传入的 `model` 若本身是 `gemini-*`，代理直接使用该模型名
- 传入未知 OpenAI 模型名，回退到默认模型

## 鉴权说明

若在 Vercel 设置了 `PROXY_API_KEY`，所有请求必须在 Header 中携带：

```
Authorization: Bearer <你设置的密码>
```

Cursor 在 API Key 栏填写密码后会自动带上这个 Header。未设置 `PROXY_API_KEY` 时不做鉴权。

## 接口说明

### `GET /api/v1/models`

返回可用模型列表（OpenAI 格式）。

### `POST /api/v1/chat/completions`

接收 OpenAI Chat Completions 格式请求，转发到 Gemini，返回兼容响应。

- 支持 `stream: true` 流式返回（SSE）
- 支持 `system` / `user` / `assistant` 多轮消息
- 兼容 Responses API 格式（`input` 字段）

## 目录结构

```
cursor-gemini-proxy/
├─ vercel.json
├─ package.json
├─ public/
│  └─ index.html
├─ lib/
│  ├─ geminiClient.ts
│  ├─ modelMap.ts
│  ├─ openaiMessages.ts
│  └─ streamOpenAI.ts
└─ api/
   └─ v1/
      ├─ models.ts
      └─ chat/
         └─ completions.ts
```

> `lib/` 必须放在 `api/` 外面。Vercel 会把 `api/` 下每个 `.ts` 都当成独立 Serverless 路由，共享代码放在里面会误部署。
