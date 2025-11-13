# Kanban — 前端 (Sticky Letters)

本前端项目以现代、简洁的 UI 将后端读取到的 Excel 中 `letter` 列内容以“便利贴 / 便签（sticky notes）”的形式随机摆放展示。前端为只读视图，会周期性轮询后端以获取最新数据。

---

## 目录
- 项目概览
- 先决条件
- 本地开发
- 配置（环境变量 / 代理）
- 构建与部署
- 前端行为说明
- 排查建议
- 许可证

---

## 项目概览
- 框架：React（Vite）
- 样式：内联样式 + Tailwind 依赖（项目已声明依赖）
- 数据来源：通过 HTTP 请求轮询后端 `GET /api/letters`
- 主要文件：
  - `index.html`：页面骨架与占位 UI
  - `src/main.jsx`：应用入口，轮询逻辑与渲染
  - `vite.config.js`：开发服务器与代理设置

---

## 先决条件
- Node.js >= 14（建议使用 Node 16+）
- npm 或 yarn
- 后端服务（位于 `backend` 目录）运行在默认 `http://localhost:3000`，或你已提供一个可访问的 API 地址

---

## 本地开发 (快速开始)
1. 进入前端目录：
   - `cd frontend`
2. 安装依赖：
   - `npm install`
3. 运行开发服务器（Vite）：
   - `npm run dev`
   - 默认会在浏览器自动打开。若需要手动设置后端地址，可参考下文配置方式。

---

## 配置（环境变量 / 代理）
- 推荐在开发时使用 `vite.config.js` 中的代理将 `/api` 转发到后端，默认代理目标为 `http://localhost:3000`。
- 如果你想在生产或不同的开发环境下使用完整的后端地址，可以通过 Vite 环境变量覆盖：
  - `VITE_API_BASE`：用于在打包时将 API 前缀设置为指定的后端基础地址（例如 `http://localhost:3000`）。在 `src/main.jsx` 中会读取此变量来构建请求 URL。
  - `VITE_API_PROXY_TARGET`：可用于本地开发时修改代理目标（`vite.config.js`）。
- 示例（在 Linux / macOS / WSL）：
  - `VITE_API_BASE=http://localhost:3000 npm run dev`
  - Windows（PowerShell）：
    - `$env:VITE_API_BASE="http://localhost:3000"; npm run dev`

---

## 构建与部署
1. 构建生产静态文件：
   - `npm run build`
   - 输出目录：`frontend/dist`
2. 本地预览构建：
   - `npm run preview`
3. 部署要点：
   - 将 `dist` 内容部署到静态文件服务器（Netlify、Vercel、nginx、静态托管服务等）。
   - 如果前端和后端不在同一域名/端口，需将前端的 `VITE_API_BASE` 指向后端完整 URL，或在服务器端设置反向代理以允许 `/api` 路径转发到后端。
   - 确保后端允许前端所在来源的 CORS（后端已在示例中启用了 CORS）。

---

## 前端行为说明
- 轮询：
  - 默认轮询间隔为 10s（`POLL_INTERVAL_MS = 10000`），可在 `src/main.jsx` 中调整。
  - 每次轮询从后端获取 `letters` 数组并在前端做随机洗牌以获得不同的展示顺序。
- 布局：
  - 前端为每张便签随机选择颜色渐变、旋转角度和页面上的位置（生成一种“手写随意贴”的视觉效果）。
  - 布局为“近似随机”，不保证绝对无重叠；可根据需要改为更严格的碰撞检测算法。
- 无编辑功能：前端仅展示并轮询后端提供的数据；编辑或更新应在后端对应 Excel 文件中进行。

---

## 排查建议
- 如果界面显示“没有便签可显示”或空白：
  - 检查后端是否已启动并且 `/api/letters` 返回有效数据（示例：`http://localhost:3000/api/letters`）。
  - 确认后端 Excel 文件路径正确（默认 `backend/data/letters.xlsx`）。
  - 在开发模式下，检查浏览器控制台和后端控制台日志。
- CORS 问题：
  - 若前端请求被阻止，确认后端允许跨域（示例后端启用了 `cors()`）。
  - 或使用 Vite 的 dev proxy 将 `/api` 转发到后端以避免浏览器跨域限制。
- Network / 404：
  - 确认 `VITE_API_BASE` 或代理设置是否正确；在开发者工具的 Network 面板查看实际发出的请求路径。

---

## 可扩展建议
- 若需要实时更新而非轮询，可以在后端增加 SSE 或 WebSocket 支持，并在前端订阅推送。
- 增加碰撞检测或力导向布局，可让便签摆放更美观且不重叠（例如使用 `d3-force`）。
- 若便签内容较长，可在样式上支持 ellipsis / 展开阅读模态窗口等交互。

---

## 许可证
本项目示例采用 MIT 许可（具体请根据实际需求调整）。

---

如果你需要，我可以：
- 提供一个示例 `letters.xlsx` 文件内容说明或样例；
- 将前端改为支持 SSE / WebSocket 的实时更新示例；
- 或者把便签布局改为更复杂的无重叠算法，并将示例代码加入到 `src` 中。
