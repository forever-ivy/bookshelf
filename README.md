# Smart Bookshelf Web / API

家庭智慧书架项目，包含 Web 页面、SQLite 数据库、OCR 识别、语音交互，以及面向后续 APP 开发的 REST API。

当前后端主入口为 [app.py](/c:/Users/32140/Desktop/smart_bookshelf_Web%20(2)/app.py)，数据库文件为 [data/bookshelf.db](/c:/Users/32140/Desktop/smart_bookshelf_Web%20(2)/data/bookshelf.db)。

## 1. 当前已实现功能

- 书架格口管理：查询所有格口、查看当前占用状态、查当前格口的书名。
- 存书：支持 OCR 图像识别存书，也支持摄像头流程触发存书。
- 取书：支持按格口取书，也支持按文本模糊匹配取书。
- 书籍主数据管理：支持查询、创建、更新图书元数据。
- 家庭成员管理：支持新增、编辑、删除、切换当前活跃成员。
- 家庭维度管理：支持家庭、账号、账号与成员关系维护。
- 阅读目标：支持每周阅读目标设置与查询。
- 阅读日志与统计：支持借阅日志、家庭统计、周报、月报、徽章、必读书单。
- 语音对话：支持语音转文本、唤醒词、TTS 播报、SSE 事件流。
- 阅读事件埋点：支持统一记录 APP / Web / 设备侧行为事件。

## 2. 当前数据库设计概览

核心表：

- `books`：书籍主数据。
- `compartments`：书架格口。
- `stored_books`：当前在架关系。
- `borrow_logs`：存取日志事实表。
- `users`：家庭成员 / 阅读主体。
- `user_sessions`：当前活跃成员。
- `reading_goals`：阅读目标。

扩展表：

- `user_badges`：徽章。
- `required_books`：必读书单。
- `accounts`：APP 登录账号预留表。
- `families`：家庭维度表。
- `account_user_rel`：账号与家庭成员关联表。
- `reading_events`：通用阅读/行为事件表。

已清理：

- `book_messages`：原设计未接入业务，已从数据库和迁移脚本中移除。

## 3. 目录结构

```text
smart_bookshelf_Web (2)/
├─ app.py                  Flask 主服务
├─ ai/
│  ├─ book_match_ai.py     AI 对话 / OCR 书籍解析 / 阅读分析
│  └─ voice_module.py      语音识别与 TTS
├─ db/
│  ├─ shelf_ops.py         书架存取数据库操作
│  ├─ user_ops.py          家庭成员与统计
│  └─ book_match.py        书名模糊匹配
├─ ocr/
│  ├─ paddle_ocr.py        PaddleOCR 封装
│  └─ video_ocr.py         摄像头 OCR 流程
├─ static/                 Web 前端资源
├─ templates/              Web 页面模板
└─ data/bookshelf.db       SQLite 数据库
```

## 4. 安装与运行

### 4.1 Python 依赖

```bash
pip install -r requirements.txt
```

`requirements.txt` 当前包含：

- `numpy==1.26.4`
- `opencv-python`
- `thefuzz`
- `paddleocr==2.7.3`
- `edge-tts`
- `vosk`
- `requests`
- `sounddevice`
- `playsound==1.2.2`

### 4.2 启动服务

```bash
python app.py
```

默认监听：

- `http://0.0.0.0:5000`

Web 页面入口：

- `GET /`

## 5. 关键环境变量

| 变量名 | 默认值 | 作用 |
| --- | --- | --- |
| `VOICE_MODE` | `auto` | 语音模式分发 |
| `VOICE_MODEL_DISPATCH` | `0` | 是否启用模型分发 |
| `WAKE_DEBUG_LOG` | `0` | 是否输出唤醒调试事件 |
| `ENABLE_WAKE_LISTEN` | `0` | 是否启用后台唤醒监听线程 |
| `PADDLEOCR_SHOW_LOG` | `0` | 是否显示 PaddleOCR 日志 |

## 6. APP 端接口清单

约定：

- 接口返回格式以 JSON 为主。
- 除文件上传接口外，默认请求体为 `application/json`。
- 当前没有正式的登录鉴权中间件，`accounts` 相关接口目前是“账号数据管理接口”，不是完整认证系统。

### 6.1 书架与存取

| 方法 | 路径 | 用途 | 主要参数 |
| --- | --- | --- | --- |
| `GET` | `/api/compartments` | 查询全部格口状态 | 无 |
| `POST` | `/api/store` | 通过本机摄像头流程存书 | 无，适合本地设备，不适合移动端直连 |
| `POST` | `/api/take` | 按格口取书 | `cid`, `title` |
| `POST` | `/api/take_by_text` | 按文本模糊查找并取书 | `text` |
| `POST` | `/api/ocr/ingest` | 上传图片并执行 OCR 存书 | `multipart/form-data` 的 `image`；可选查询参数 `source`, `audio=1` |

说明：

- APP 侧推荐用 `/api/ocr/ingest`，不要用 `/api/store`。
- `/api/ocr/ingest` 成功时返回 `ok`, `msg`, `ai_reply`, `reply`, `audio_b64`, `audio_format`。

### 6.2 图书管理

| 方法 | 路径 | 用途 | 主要参数 |
| --- | --- | --- | --- |
| `GET` | `/api/books` | 查询图书列表 | 查询参数：`q`, `category`, `stored_only`, `limit` |
| `POST` | `/api/books` | 创建图书 | `title` 必填；其余支持 `author`, `category`, `keywords`, `description`, `isbn`, `publisher`, `publish_year`, `age_min`, `age_max`, `difficulty_level`, `tags`, `cover_url`, `updated_at` |
| `GET` | `/api/books/<book_id>` | 查询单本图书详情 | 路径参数 `book_id` |
| `PUT` | `/api/books/<book_id>` | 更新图书 | 同上字段，按需提交 |

图书返回中包含：

- `on_shelf_count`
- `is_on_shelf`
- 列表接口额外返回 `compartment_ids`

### 6.3 家庭成员管理

| 方法 | 路径 | 用途 | 主要参数 |
| --- | --- | --- | --- |
| `GET` | `/api/users` | 查询全部家庭成员 | 无 |
| `POST` | `/api/users` | 创建家庭成员 | `name` 必填；支持 `role`, `avatar`, `pin`, `color`, `gender`, `birth_date`, `age`, `grade_level`, `reading_level`, `interests`, `family_id` |
| `GET` | `/api/users/<uid>` | 查询成员详情 | 路径参数 `uid` |
| `PUT` | `/api/users/<uid>` | 更新成员 | 同上字段，按需提交 |
| `DELETE` | `/api/users/<uid>` | 删除成员 | 路径参数 `uid` |
| `GET` | `/api/users/current` | 获取当前活跃成员 | 无 |
| `POST` | `/api/users/switch` | 切换当前活跃成员 | `user_id` |

### 6.4 家庭管理

| 方法 | 路径 | 用途 | 主要参数 |
| --- | --- | --- | --- |
| `GET` | `/api/families` | 查询家庭列表 | 无 |
| `POST` | `/api/families` | 创建家庭 | `family_name` 必填；可选 `owner_account_id` |
| `GET` | `/api/families/<family_id>` | 查询家庭详情及成员 | 路径参数 `family_id` |
| `PUT` | `/api/families/<family_id>` | 更新家庭 | `family_name`, `owner_account_id` |
| `DELETE` | `/api/families/<family_id>` | 删除家庭 | 要求家庭下没有成员 |

### 6.5 APP 账号管理

| 方法 | 路径 | 用途 | 主要参数 |
| --- | --- | --- | --- |
| `GET` | `/api/accounts` | 查询账号列表 | 无 |
| `POST` | `/api/accounts` | 创建账号 | `username` 或 `phone` 至少一个；可选 `password_hash`, `status`, `last_login_at`, `created_at`, `updated_at` |
| `GET` | `/api/accounts/<account_id>` | 查询账号详情 | 路径参数 `account_id` |
| `PUT` | `/api/accounts/<account_id>` | 更新账号 | 同上字段，按需提交 |
| `DELETE` | `/api/accounts/<account_id>` | 删除账号 | 要求没有关联成员，也不是任何家庭的 owner |

注意：

- 当前只是账号数据表，不包含登录态签发、Token、密码校验接口。
- `password_hash` 目前按普通字符串存取，哈希生成逻辑需要 APP 或后续认证模块补上。

### 6.6 账号与成员关联

| 方法 | 路径 | 用途 | 主要参数 |
| --- | --- | --- | --- |
| `GET` | `/api/accounts/<account_id>/users` | 查询账号关联的成员 | 路径参数 `account_id` |
| `POST` | `/api/accounts/<account_id>/users` | 绑定账号与成员 | `user_id` 必填；可选 `relation_type` |
| `DELETE` | `/api/accounts/<account_id>/users/<user_id>` | 解绑账号与成员 | 路径参数 |
| `GET` | `/api/users/<uid>/accounts` | 查询成员关联的账号 | 路径参数 `uid` |

### 6.7 阅读目标、统计、日志、徽章

| 方法 | 路径 | 用途 | 主要参数 |
| --- | --- | --- | --- |
| `GET` | `/api/users/<uid>/stats` | 用户阅读统计 | 路径参数 `uid` |
| `GET` | `/api/family/stats` | 全家统计 | 无 |
| `POST` | `/api/users/<uid>/goal` | 设置每周目标 | `weekly_target` |
| `GET` | `/api/users/<uid>/goal` | 查询每周目标 | 路径参数 `uid` |
| `GET` | `/api/users/<uid>/borrow_logs` | 借阅日志 | 查询参数 `days`，默认 `30` |
| `GET` | `/api/users/<uid>/badges` | 徽章列表 | 路径参数 `uid` |
| `GET` | `/api/users/<uid>/weekly_report` | 用户周报 | 路径参数 `uid` |
| `GET` | `/api/family/monthly_report` | 家庭月报 | 无 |

### 6.8 必读书单

| 方法 | 路径 | 用途 | 主要参数 |
| --- | --- | --- | --- |
| `GET` | `/api/users/<uid>/booklist` | 查询必读书单 | 路径参数 `uid` |
| `POST` | `/api/users/<uid>/booklist` | 新增必读书 | `title` 必填；可选 `note`, `book_id`, `assigned_by_user_id` |
| `DELETE` | `/api/users/<uid>/booklist/<bid>` | 删除一条必读书 | 路径参数 |
| `POST` | `/api/users/<uid>/booklist/<bid>/done` | 标记完成 | 路径参数 |
| `POST` | `/api/booklist/notify` | 触发语音播报 | `child_name`, `book_title`；可选 `note` |

书单返回字段包括：

- `id`
- `user_id`
- `title`
- `note`
- `done`
- `created_at`
- `book_id`
- `assigned_by_user_id`
- `done_at`

### 6.9 阅读事件埋点

| 方法 | 路径 | 用途 | 主要参数 |
| --- | --- | --- | --- |
| `GET` | `/api/reading_events` | 查询事件列表 | 查询参数：`user_id`, `book_id`, `event_type`, `source`, `limit` |
| `POST` | `/api/reading_events` | 写入行为事件 | `event_type` 必填；可选 `user_id`, `book_id`, `event_time`, `source`, `metadata_json` |

适合 APP 记录的典型事件：

- `search`
- `view_book`
- `open_book_detail`
- `scan_start`
- `scan_success`
- `recommend_click`
- `goal_update`

### 6.10 对话、语音、TTS

| 方法 | 路径 | 用途 | 主要参数 |
| --- | --- | --- | --- |
| `POST` | `/api/chat` | 文本对话 | `text` |
| `GET` | `/api/chat/history` | 当前用户对话历史 | 无 |
| `POST` | `/api/chat/clear` | 清空某用户对话历史 | `user_id` |
| `POST` | `/api/voice_chat` | 直接麦克风语音对话 | 本机设备能力，不适合移动端直连 |
| `POST` | `/api/voice/ingest` | 上传音频并路由语音意图 | `multipart/form-data` 的 `audio`；可选 `image`, `source`, `mode`, `hints_extra` |
| `GET` | `/api/voice_events` | 获取最近语音事件 | 无 |
| `GET` | `/api/voice_stream` | 语音事件 SSE 流 | 无 |
| `POST` | `/api/tts_say` | 文本转音频 | `text` |

`/api/voice/ingest` 适合 APP 使用，返回常见字段：

- `ok`
- `ignore`
- `wake`
- `intent`
- `text`
- `reply`
- `audio_b64`
- `audio_format`

### 6.11 AI 阅读分析

| 方法 | 路径 | 用途 | 主要参数 |
| --- | --- | --- | --- |
| `GET` | `/api/ai_insight` | 获取当前 AI 阅读洞察 | 无 |

## 7. 推荐的 APP 接入优先级

建议先接这几类接口：

1. 成员体系：`/api/users`、`/api/users/current`、`/api/users/switch`
2. 图书与书架：`/api/books`、`/api/compartments`
3. 存取动作：`/api/ocr/ingest`、`/api/take`、`/api/take_by_text`
4. 数据分析：`/api/users/<uid>/stats`、`/api/users/<uid>/borrow_logs`
5. 家庭能力：`/api/families`、`/api/accounts`、`/api/accounts/<id>/users`
6. 埋点扩展：`/api/reading_events`

## 8. 其他实现说明

### 8.1 关于“同一本书多册”

当前 `stored_books.book_id` 做了唯一约束，以避免同一条书目记录被同时挂到多个格口。

为兼容现实中的“同书多册”，后端在存书时如果发现目标 `book_id` 已在架，会自动复制一条 `books` 记录作为另一册再入架。这样对现有代码改动最小，但有一个结果要接受：

- 数据库里的 `books` 更接近“书目 + 册次混合模型”
- 如果后续要做严格副本管理，建议新增 `book_copies` 表

### 8.2 关于 APP 登录

目前已经有以下数据表和接口：

- `accounts`
- `families`
- `account_user_rel`

但还没有：

- 登录接口
- 注册接口
- Token / Session 鉴权
- 密码哈希生成与校验
- 权限控制

所以当前阶段应理解为：后端已经具备账号相关数据结构和管理 API，但还不是完整认证系统。

### 8.3 关于 OCR 与语音

- OCR 基于 PaddleOCR。
- 语音识别与唤醒依赖本地音频环境。
- `/api/store`、`/api/voice_chat` 更偏“运行在书架设备本机”的能力。
- APP 场景优先用上传式接口：`/api/ocr/ingest`、`/api/voice/ingest`、`/api/tts_say`。

## 9. 当前已知边界

- 暂无统一鉴权，APP 上线前必须补认证层。
- 部分旧接口仍沿用较早期的返回格式，后续如要统一可再收口。
- 周报、月报、AI 对话依赖本地 AI 服务与 TTS/ASR 环境。
- `borrow_logs` 和 `reading_events` 已能支撑后续数据分析，但字段规范仍可继续增强。

## 10. 后续建议

- 增加认证模块：注册、登录、Token、权限校验。
- 增加 `book_copies` 表，彻底区分“书目”和“实体册”。
- 统一所有接口的错误码和响应结构。
- 为 APP 增加 OpenAPI / Swagger 文档。
- 为数据库迁移建立正式脚本，而不是只修改现有 SQLite 文件。

