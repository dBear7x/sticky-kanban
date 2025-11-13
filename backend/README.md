# Kanban 后端 (Backend)

这个后端服务负责从一个固定位置的 Excel 文件读取数据并提供一个简单的 HTTP API，供前端以“便利贴”（sticky notes）样式定期轮询并展示 `letter` 列的内容。

## 主要功能概述

- 读取指定 Excel 文件（默认：`./data/letters.xlsx`，可通过 `EXCEL_PATH` 环境变量覆盖）。
- 使用第一个工作表（first sheet）。
- 查找名为 `letter` 的列（不区分大小写；若没有严格匹配，则尝试匹配包含 `letter` 的列名）。
- 将每一行 `letter` 列的值作为一条便签文本，去除前后空白并忽略空值。
- 将读取结果以 JSON 形式通过 API 暴露给前端。
- 使用文件修改时间缓存解析结果，只有在文件发生变更时才重新读取。

## 要求的 Excel 格式

- 文件格式：.xlsx（建议），`xlsx` 库也可以读取常见的 Excel 格式。
- 使用第一个工作表。
- 需要或期望包含一个列头（header）为 `letter` 的列（大小写不敏感）。
- 可选：可以包含 `id` 列。如果存在 `id`，后端会优先使用它来作为每条记录的 id；否则后端会基于行顺序生成 id（从 1 开始）。
- 每一行对应一条便签（如果 `letter` 单元格为空/只包含空白，则忽略该行）。

示例（表格展示）：

| id (可选) | letter            |
|-----------|--------------------|
| 1         | Buy milk           |
| 2         | Prepare slides     |
|           | Call Alice         |
|           | Fix bug in signup  |

说明：
- 第三行没有 `id`，后端会为其分配顺序 id（如果没有显式 `id` 列）。
- 空的 `letter` 单元格会被忽略，不会出现在返回结果中。

## API

- GET /api/letters
  - 返回示例：
    {
      "letters": [
        { "id": 1, "text": "Buy milk" },
        { "id": 2, "text": "Prepare slides" },
        { "id": 3, "text": "Call Alice" }
      ],
      "updatedAt": "2025-11-13T10:00:00.000Z",
      "source": "letters.xlsx"
    }
  - 说明：
    - `letters`：数组，按读取顺序（或 Excel 中顺序）返回。每项包含 `id` 和 `text`。
    - `updatedAt`：后端最后一次读取并缓存数据的时间戳（ISO 格式）。
    - `source`：数据来源文件名。

- GET /health
  - 返回简单的健康检查信息：{ status: 'ok', now: '...' }

根路径 `/` 会返回一个简单的 HTML 页面，列出可用端点并显示当前配置的 Excel 路径（仅用于开发/调试）。

## 配置与运行

- 必需依赖：已在 package.json 中声明（express、cors、xlsx 等）。
- 默认 Excel 文件路径：`./data/letters.xlsx`（相对于后端目录）。
- 可通过环境变量覆盖：
  - `PORT`：HTTP 端口（默认 3000）
  - `EXCEL_PATH`：Excel 文件的绝对或相对路径（例如：`/opt/data/letters.xlsx` 或 `./data/letters.xlsx`）

本地运行示例：
1. 在 `backend` 目录执行 `npm install`
2. 将你的 Excel 文件放到 `backend/data/letters.xlsx`，或设置 `EXCEL_PATH` 指向文件位置
3. 启动服务：
   - `npm start` 或 `npm run dev`（如果安装了 nodemon）

## 错误与边界情况

- 如果找不到文件或文件不可读：
  - API 仍会返回成功的响应，但 `letters` 数组为空，并在 `source` 中显示配置的路径。
  - 日志会记录相应的警告或错误信息。
- 如果 Excel 中没有可识别的 `letter` 列：
  - 返回 `letters: []`，并在日志中记录未找到合适列的信息。
- 后端对文件使用基于文件修改时间（mtime）的简单缓存策略：只有当文件的 mtime 发生变化时才重新读取和解析。

## 前端集成建议（说明性）

- 前端负责将收到的 `letters` 列表以“便利贴”卡片的形式随机摆放在页面上（旋转角度、背景色、位置可随机化以获得更“手写”/贴纸效果）。
- 建议轮询频率：每 5–15 秒一次，根据用户体验和数据更新频率调整。也可以用 WebSocket 或 SSE 实现更高效的实时更新，但本后端当前仅提供轮询式 API。
- 前端无需在后端进行去重或排序（除非你想保持固定顺序）。如果希望前端展示随机顺序，请在前端对数组进行洗牌（shuffle）。

## 日志与调试

- 后端会在读取 Excel 时在控制台输出加载数量和时间点，启动时也会尝试执行一次初始加载以便快速发现文件路径或格式问题。
- 常见开发问题：
  - Windows 下文件被其他程序占用可能导致读取失败，请确保 Excel 文件没有被锁定。
  - 确保列头拼写合理（`letter` 或包含 `letter` 的列名）。

## 示例 Excel 创建提示

- 使用 Excel 或 Google Sheets 创建一张表，第一行作为列头，包含 `letter` 列，随后每一行为一条便签文本。
- 导出为 `.xlsx`，放到 `backend/data/letters.xlsx`。

---

如果你需要，我可以：
- 提供一个示例 Excel 文件（带几条示例便签）。
- 在后端增加一个调试端点显示解析细节（例如：显示使用了哪个列名解析、跳过了哪些空行等）。
- 或者为前端提供一个样式参考（HTML/CSS/JS）用于把这些文字渲染成现代、美观的便利贴界面。