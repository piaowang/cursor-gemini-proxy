# cursor-gemini-proxy

一个部署在 Vercel 上的 OpenAI 兼容代理。

它接收 Cursor 自定义 OpenAI 的请求：
- `GET /api/v1/models`
- `POST /api/v1/chat/completions`

然后把请求转换为 Google Gemini API，再把结果按 OpenAI 兼容格式返回给 Cursor 使用。

## 功能

- 支持 OpenAI 风格聊天接口
- 支持 `stream: true` 流式返回
- 支持 `system` / `user` / `assistant` 多轮消息
- 支持在 `model` 中填写 OpenAI 模型名，由服务端映射到 Gemini
- 也支持直接传 `gemini-*` 模型名直连 Google

## 部署到 Vercel

1. 导入此仓库到 Vercel
2. 在项目环境变量中添加：

```env
GOOGLE_API_KEY=你的谷歌API密钥
```

3. 直接部署

部署完成后，你的基础地址类似：

```text
https://your-project.vercel.app/api/v1
```

## Cursor 配置

在 Cursor 的自定义 OpenAI 提供商里填写：

- Base URL: `https://your-project.vercel.app/api/v1`
- API Key: 任意字符串即可

说明：
- Cursor 会请求 `/chat/completions`
- 也会读取 `/models`
- 实际调用 Gemini 使用的是服务端环境变量 `GOOGLE_API_KEY`

## 模型映射关系

当前代码中的映射如下：

| Cursor / OpenAI 模型名 | Gemini 模型名 |
| --- | --- |
| `gpt-4o-mini` | `gemini-2.0-flash-lite` |
| `gpt-4o` | `gemini-2.0-flash` |
| `gpt-4.1-mini` | `gemini-2.0-flash-lite` |
| `gpt-4.1` | `gemini-2.0-flash` |
| `gpt-4.1-pro` | `gemini-1.5-pro` |

默认回退模型：

```text
gemini-2.0-flash
```

补充规则：
- 如果传入的 `model` 本身就是 `gemini-*`，代理会直接使用该模型
- 如果传入未知 OpenAI 模型名，会回退到默认模型 `gemini-2.0-flash`

## 请求示例

### 非流式

```json
{
  "model": "gpt-4o",
  "stream": false,
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "你好，介绍一下你自己" }
  ]
}
```

### 流式

```json
{
  "model": "gpt-4o",
  "stream": true,
  "messages": [
    { "role": "user", "content": "请逐步解释什么是 TypeScript" }
  ]
}
```

## 返回行为

- `stream: false` 时，返回 OpenAI 风格的 `chat.completion`
- `stream: true` 时，返回 OpenAI 风格的 SSE `chat.completion.chunk`
- 流结束时返回：

```text
data: [DONE]
```

## 接口说明

### `GET /api/v1/models`

返回当前可供 Cursor 选择的 OpenAI 风格模型列表。

### `POST /api/v1/chat/completions`

接收 OpenAI 风格请求，转发到 Gemini，并返回兼容响应。

## 目录结构

```text
cursor-gemini-proxy/
├─ package.json
├─ vercel.json
├─ lib/
│  ├─ geminiClient.ts
│  ├─ modelMap.ts
│  ├─ openaiMessages.ts
│  └─ streamOpenAI.ts
└─ api/
   └─ v1/
      ├─ chat/
      │  └─ completions.ts
      └─ models.ts
```

说明：`lib/` 必须放在 `api/` 外面。Vercel 会把 `api/` 下每个 `.ts` 都当成独立 Serverless 路由；共享代码放在 `api/` 里会误部署并可能导致构建报错。

## 注意事项

- 请确认你的 `GOOGLE_API_KEY` 对应的账号有可用的 Gemini 模型权限
- 某些 Gemini 模型可能会随时间调整名称或可用性
- 如果某个映射模型不可用，可以直接修改 `lib/modelMap.ts`

## Vercel CLI 报错：Function Runtimes must have a valid version

常见原因与处理：

1. **`vercel.json` 里不要写** `"runtime": "nodejs20.x"` 这类字段；Node 版本用 `package.json` 的 `engines.node` 指定。
2. 仓库里不要同时留 **`now.json`**，只保留 `vercel.json`（且建议带 `"version": 2`）。
3. 修改配置后重新 **push 到 GitHub** 再部署；本地 CLI 请确认在**项目根目录**执行，且拉取的是最新提交。
