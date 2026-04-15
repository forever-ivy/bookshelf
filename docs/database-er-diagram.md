# Smart Bookshelf 数据库 ER 图

这份文档按模块整理当前 `service` 后端的数据库结构，覆盖目前在 `app/*/models.py` 中注册到 SQLAlchemy `Base` 的数据表，并补充迁移期需要理解的 legacy 结构。

说明：

- 为保证可读性，ER 图中保留了每张表的主键、主要外键和核心业务字段。
- 大部分表都还有 `created_at`、`updated_at` 一类审计字段，图中不再重复展开。
- `Tutor` 已在 `20260415_01` 迁移并退场，文档里保留其结构只用于说明历史数据如何迁入 `Learning`。
- `column_property`、部分 PostgreSQL 索引和检查约束未完全画入 ER 图，但在模型中仍然存在。

## 总览图

```mermaid
erDiagram
    ADMIN_ACCOUNTS {
        int id PK "管理员主键"
        string username "登录名"
    }

    READER_ACCOUNTS {
        int id PK "读者账号主键"
        string username "登录名"
    }

    READER_PROFILES {
        int id PK "读者画像主键"
        int account_id FK "对应读者账号"
        string display_name "显示名称"
        string segment_code "读者分群"
    }

    BOOKS {
        int id PK "图书主键"
        int category_id FK "分类主键"
        string title "书名"
        string author "作者"
        string shelf_status "馆藏状态"
    }

    BOOK_SOURCE_DOCUMENTS {
        int id PK "图书资料主键"
        int book_id FK "所属图书"
        string source_kind "资料类型"
        string parse_status "解析状态"
        bool is_primary "是否主资料"
    }

    CABINETS {
        string id PK "书柜主键"
        string name "书柜名称"
        string status "书柜状态"
    }

    BOOK_COPIES {
        int id PK "册副本主键"
        int book_id FK "所属图书"
        int current_slot_id FK "当前槽位"
        string inventory_status "库存状态"
    }

    BORROW_ORDERS {
        int id PK "借阅单主键"
        int reader_id FK "下单读者"
        int requested_book_id FK "请求图书"
        int fulfilled_copy_id FK "履约副本"
        string status "借阅状态"
    }

    ORDER_FULFILLMENTS {
        int id PK "履约记录主键"
        int borrow_order_id FK "所属借阅单"
        string mode "履约模式"
        string status "履约状态"
    }

    ROBOT_TASKS {
        int id PK "机器人任务主键"
        int robot_id FK "执行机器人"
        int fulfillment_id FK "关联履约"
        string status "任务状态"
    }

    TUTOR_PROFILES {
        int id PK "旧版导学本主键"
        int reader_id FK "所属读者"
        int book_id FK "关联图书"
        string title "导学标题"
        string status "生成状态"
    }

    LEARNING_PROFILES {
        int id PK "新版学习空间主键"
        int reader_id FK "所属读者"
        int source_bundle_id FK "资料包"
        int active_path_version_id FK "当前路径版本"
        string title "学习空间标题"
        string status "学习空间状态"
    }

    LEARNING_SESSIONS {
        int id PK "学习会话主键"
        int profile_id FK "所属学习空间"
        string session_kind "guide/explore"
        int source_session_id FK "来源 guide 会话"
        int focus_step_index "聚焦步骤"
        string status "会话状态"
    }

    READER_ACCOUNTS ||--|| READER_PROFILES : "一对一"
    READER_PROFILES ||--o{ BORROW_ORDERS : "发起借阅"
    READER_PROFILES ||--o{ TUTOR_PROFILES : "创建旧版导学本"
    READER_PROFILES ||--o{ LEARNING_PROFILES : "创建新版学习空间"

    BOOKS ||--o{ BOOK_SOURCE_DOCUMENTS : "拥有资料"
    BOOKS ||--o{ BOOK_COPIES : "拥有副本"
    BOOKS ||--o{ BORROW_ORDERS : "被借阅"
    BOOKS ||--o{ TUTOR_PROFILES : "作为导学来源"

    CABINETS ||--o{ BOOK_COPIES : "容纳副本"
    BORROW_ORDERS ||--|| ORDER_FULFILLMENTS : "对应履约"
    ORDER_FULFILLMENTS ||--o{ ROBOT_TASKS : "驱动机器人任务"

    BOOK_SOURCE_DOCUMENTS ||--o{ TUTOR_PROFILES : "可作为旧版导学主资料"
    BOOK_SOURCE_DOCUMENTS ||--o{ LEARNING_PROFILES : "可作为新版学习资料"

    LEARNING_PROFILES ||--o{ LEARNING_SESSIONS : "开启学习会话"
    LEARNING_SESSIONS ||--o{ LEARNING_SESSIONS : "guide 派生 explore"
```

总览说明：

- `Reader / Book / Inventory / Order` 是业务主线。
- `Tutor` 和 `Learning` 共用 `Reader`、`Book`、`BookSourceDocument` 这些基础实体。
- `LearningSession` 已经支持 `Guide` 和 `Explore` 双模式，并能通过 `source_session_id` 实现桥接。

## 模块一：认证、后台与系统配置

```mermaid
erDiagram
    ADMIN_ACCOUNTS {
        int id PK "管理员主键"
        string username "登录名"
        string password_hash "密码哈希"
    }

    ADMIN_ACTION_LOGS {
        int id PK "管理员操作日志"
        int admin_id FK "操作管理员"
        string target_type "对象类型"
        string target_ref "对象标识"
        string action "执行动作"
    }

    ADMIN_ROLES {
        int id PK "角色主键"
        string code "角色编码"
        string name "角色名"
    }

    ADMIN_PERMISSIONS {
        int id PK "权限主键"
        string code "权限编码"
        string name "权限名"
    }

    ADMIN_ROLE_PERMISSIONS {
        int id PK "角色权限关联"
        int role_id FK "角色"
        int permission_id FK "权限"
    }

    ADMIN_ROLE_ASSIGNMENTS {
        int id PK "管理员角色分配"
        int admin_id FK "管理员"
        int role_id FK "角色"
    }

    ALERT_RECORDS {
        int id PK "告警记录"
        string source_type "来源类型"
        string alert_type "告警类型"
        string severity "严重级别"
        string status "处理状态"
        int acknowledged_by FK "确认人"
        int resolved_by FK "解决人"
    }

    RECOMMENDATION_PLACEMENTS {
        int id PK "推荐位定义"
        string code "推荐位编码"
        string name "推荐位名称"
        string placement_type "投放场景"
        string status "启用状态"
    }

    RECOMMENDATION_STUDIO_PUBLICATIONS {
        int id PK "推荐编排发布记录"
        int published_by FK "发布管理员"
        int version "版本号"
        string status "发布状态"
    }

    SYSTEM_SETTINGS {
        int id PK "系统配置"
        string setting_key "配置键"
        string value_type "值类型"
        int created_by FK "创建管理员"
        int updated_by FK "更新管理员"
    }

    ADMIN_ACCOUNTS ||--o{ ADMIN_ACTION_LOGS : "记录操作"
    ADMIN_ACCOUNTS ||--o{ ADMIN_ROLE_ASSIGNMENTS : "授予角色"
    ADMIN_ROLES ||--o{ ADMIN_ROLE_ASSIGNMENTS : "被分配给管理员"
    ADMIN_ROLES ||--o{ ADMIN_ROLE_PERMISSIONS : "拥有权限"
    ADMIN_PERMISSIONS ||--o{ ADMIN_ROLE_PERMISSIONS : "被角色引用"
    ADMIN_ACCOUNTS ||--o{ ALERT_RECORDS : "确认/解决告警"
    ADMIN_ACCOUNTS ||--o{ RECOMMENDATION_STUDIO_PUBLICATIONS : "发布推荐配置"
    ADMIN_ACCOUNTS ||--o{ SYSTEM_SETTINGS : "维护系统配置"
```

中文注释：

- `admin_accounts`：后台管理员账号。
- `admin_action_logs`：后台操作审计，记录谁改了什么。
- `admin_roles / admin_permissions / admin_role_permissions / admin_role_assignments`：后台 RBAC 权限系统。
- `alert_records`：后台告警中心。
- `recommendation_placements / recommendation_studio_publications`：推荐位配置和发布快照。
- `system_settings`：全局系统设置表。

## 模块二：读者与个人化资产

```mermaid
erDiagram
    READER_ACCOUNTS {
        int id PK "读者账号主键"
        string username "登录名"
        string password_hash "密码哈希"
    }

    READER_PROFILES {
        int id PK "读者画像主键"
        int account_id FK "读者账号"
        string display_name "显示名称"
        string affiliation_type "身份类型"
        string college "学院"
        string major "专业"
        string segment_code "分群编码"
    }

    FAVORITE_BOOKS {
        int id PK "收藏记录"
        int reader_id FK "读者"
        int book_id FK "图书"
    }

    READER_BOOKLISTS {
        int id PK "个人书单"
        int reader_id FK "所属读者"
        string title "书单标题"
    }

    READER_BOOKLIST_ITEMS {
        int id PK "书单条目"
        int booklist_id FK "所属书单"
        int book_id FK "图书"
        int rank_position "排序"
    }

    DISMISSED_NOTIFICATIONS {
        int id PK "已忽略通知"
        int reader_id FK "读者"
        string notification_id "通知标识"
    }

    READER_ACCOUNTS ||--|| READER_PROFILES : "一对一"
    READER_PROFILES ||--o{ FAVORITE_BOOKS : "收藏图书"
    READER_PROFILES ||--o{ READER_BOOKLISTS : "创建书单"
    READER_BOOKLISTS ||--o{ READER_BOOKLIST_ITEMS : "包含图书"
    READER_PROFILES ||--o{ DISMISSED_NOTIFICATIONS : "忽略通知"
```

中文注释：

- `reader_accounts`：读者登录账号。
- `reader_profiles`：读者画像，承载兴趣、专业、分群和个性化偏好。
- `favorite_books`：收藏夹。
- `reader_booklists / reader_booklist_items`：用户自建书单。
- `dismissed_notifications`：读者在 App 中手动隐藏的通知。

## 模块三：图书目录与资料层

```mermaid
erDiagram
    BOOK_CATEGORIES {
        int id PK "分类主键"
        string code "分类编码"
        string name "分类名称"
        string status "启用状态"
    }

    BOOK_TAGS {
        int id PK "标签主键"
        string code "标签编码"
        string name "标签名称"
    }

    BOOKS {
        int id PK "图书主键"
        int category_id FK "分类"
        string title "书名"
        string author "作者"
        string isbn "ISBN"
        string barcode "条码"
        string shelf_status "馆藏状态"
    }

    BOOK_TAG_LINKS {
        int id PK "图书标签关联"
        int book_id FK "图书"
        int tag_id FK "标签"
    }

    BOOK_SOURCE_DOCUMENTS {
        int id PK "图书资料"
        int book_id FK "图书"
        string source_kind "资料类型"
        string file_name "文件名"
        string parse_status "解析状态"
        bool is_primary "是否主资料"
    }

    TOPIC_BOOKLISTS {
        int id PK "专题书单"
        string slug "唯一标识"
        string title "专题标题"
        string status "状态"
    }

    TOPIC_BOOKLIST_ITEMS {
        int id PK "专题书单条目"
        int topic_booklist_id FK "专题书单"
        int book_id FK "图书"
        int rank_position "排序"
    }

    BOOK_CATEGORIES ||--o{ BOOKS : "归类图书"
    BOOKS ||--o{ BOOK_TAG_LINKS : "绑定标签"
    BOOK_TAGS ||--o{ BOOK_TAG_LINKS : "被图书引用"
    BOOKS ||--o{ BOOK_SOURCE_DOCUMENTS : "拥有资料"
    TOPIC_BOOKLISTS ||--o{ TOPIC_BOOKLIST_ITEMS : "包含图书"
    BOOKS ||--o{ TOPIC_BOOKLIST_ITEMS : "进入专题书单"
```

中文注释：

- `book_categories`：标准分类。
- `book_tags / book_tag_links`：灵活标签体系。
- `books`：图书主数据，包含检索文本和向量字段。
- `book_source_documents`：图书关联的原始资料与解析产物，是导学/RAG 的基础数据入口。
- `topic_booklists / topic_booklist_items`：后台配置的专题书单。

## 模块四：库存、借阅、归还与机器人

```mermaid
erDiagram
    CABINETS {
        string id PK "书柜主键"
        string name "书柜名称"
        string location "位置"
        string status "状态"
    }

    CABINET_SLOTS {
        int id PK "槽位主键"
        string cabinet_id FK "所属书柜"
        string slot_code "槽位编号"
        string status "槽位状态"
    }

    BOOK_COPIES {
        int id PK "副本主键"
        int book_id FK "所属图书"
        int current_slot_id FK "当前槽位"
        string inventory_status "库存状态"
    }

    BOOK_STOCK {
        int id PK "库存汇总"
        int book_id FK "图书"
        string cabinet_id FK "书柜"
        int total_copies "总册数"
        int available_copies "可借册数"
        int reserved_copies "预留册数"
    }

    INVENTORY_EVENTS {
        int id PK "库存事件"
        string cabinet_id FK "书柜"
        int book_id FK "图书"
        int copy_id FK "副本"
        string event_type "事件类型"
    }

    BORROW_ORDERS {
        int id PK "借阅单"
        int reader_id FK "读者"
        int requested_book_id FK "请求图书"
        int fulfilled_copy_id FK "履约副本"
        string fulfillment_mode "履约模式"
        string status "借阅状态"
    }

    ORDER_FULFILLMENTS {
        int id PK "履约记录"
        int borrow_order_id FK "借阅单"
        string source_cabinet_id FK "源书柜"
        int source_slot_id FK "源槽位"
        string mode "履约模式"
        string status "履约状态"
    }

    RETURN_REQUESTS {
        int id PK "归还请求"
        int borrow_order_id FK "借阅单"
        int copy_id FK "归还副本"
        string receive_cabinet_id FK "回收书柜"
        int receive_slot_id FK "回收槽位"
        int processed_by_admin_id FK "处理管理员"
        string status "归还状态"
    }

    ROBOT_UNITS {
        int id PK "机器人"
        string code "机器人编码"
        string status "机器人状态"
    }

    ROBOT_TASKS {
        int id PK "机器人任务"
        int robot_id FK "机器人"
        int fulfillment_id FK "履约记录"
        int reassigned_from_task_id FK "前序任务"
        int superseded_by_task_id FK "后继任务"
        string status "任务状态"
    }

    ROBOT_STATUS_EVENTS {
        int id PK "机器人状态事件"
        int robot_id FK "机器人"
        int task_id FK "任务"
        string event_type "事件类型"
    }

    CABINETS ||--o{ CABINET_SLOTS : "包含槽位"
    CABINETS ||--o{ BOOK_STOCK : "汇总库存"
    CABINETS ||--o{ INVENTORY_EVENTS : "产生库存事件"
    CABINETS ||--o{ ORDER_FULFILLMENTS : "作为取书点"
    CABINETS ||--o{ RETURN_REQUESTS : "作为还书点"

    BOOKS ||--o{ BOOK_COPIES : "拆成副本"
    BOOKS ||--o{ BOOK_STOCK : "形成库存汇总"
    BOOKS ||--o{ INVENTORY_EVENTS : "参与库存事件"
    BOOKS ||--o{ BORROW_ORDERS : "被请求借阅"

    CABINET_SLOTS ||--o{ BOOK_COPIES : "存放副本"
    CABINET_SLOTS ||--o{ ORDER_FULFILLMENTS : "作为发货槽位"
    CABINET_SLOTS ||--o{ RETURN_REQUESTS : "作为回收槽位"

    READER_PROFILES ||--o{ BORROW_ORDERS : "发起借阅"
    BOOK_COPIES ||--o{ BORROW_ORDERS : "履约借阅单"
    BORROW_ORDERS ||--|| ORDER_FULFILLMENTS : "唯一履约"
    BORROW_ORDERS ||--o| RETURN_REQUESTS : "发起归还"

    ADMIN_ACCOUNTS ||--o{ RETURN_REQUESTS : "处理归还"
    ROBOT_UNITS ||--o{ ROBOT_TASKS : "执行任务"
    ORDER_FULFILLMENTS ||--o{ ROBOT_TASKS : "触发机器人任务"
    ROBOT_TASKS ||--o{ ROBOT_STATUS_EVENTS : "产生状态事件"
```

中文注释：

- `cabinets / cabinet_slots`：智能书柜及其槽位。
- `book_copies / book_stock / inventory_events`：副本、库存汇总、库存流水。
- `borrow_orders / order_fulfillments / return_requests`：借阅、履约、归还主链路。
- `robot_units / robot_tasks / robot_status_events`：机器人配送模拟链路。

## 模块五：推荐、搜索、会话与行为分析

```mermaid
erDiagram
    RECOMMENDATION_LOGS {
        int id PK "推荐日志"
        int reader_id FK "读者"
        int book_id FK "图书"
        string result_title "返回标题"
        int rank_position "排序"
        float score "分数"
    }

    SEARCH_LOGS {
        int id PK "检索日志"
        int reader_id FK "读者"
        string query_text "查询语句"
        string query_mode "检索模式"
    }

    READING_EVENTS {
        int id PK "阅读行为事件"
        int reader_id FK "读者"
        string event_type "行为类型"
    }

    CONVERSATION_SESSIONS {
        int id PK "通用对话会话"
        int reader_id FK "读者"
        string status "状态"
    }

    CONVERSATION_MESSAGES {
        int id PK "通用对话消息"
        int session_id FK "会话"
        string role "角色"
        string content "内容"
    }

    READER_PROFILES ||--o{ RECOMMENDATION_LOGS : "记录推荐曝光"
    BOOKS ||--o{ RECOMMENDATION_LOGS : "作为推荐结果"
    READER_PROFILES ||--o{ SEARCH_LOGS : "记录检索"
    READER_PROFILES ||--o{ READING_EVENTS : "记录阅读行为"
    READER_PROFILES ||--o{ CONVERSATION_SESSIONS : "开启通用会话"
    CONVERSATION_SESSIONS ||--o{ CONVERSATION_MESSAGES : "包含消息"
```

中文注释：

- `recommendation_logs`：推荐结果和解释日志。
- `search_logs`：图书检索日志。
- `reading_events`：阅读和使用行为事件。
- `conversation_sessions / conversation_messages`：通用问答/闲聊会话，不专属于导学。

## 模块六：旧版导学域 Tutor（已退场，仅迁移参考）

```mermaid
erDiagram
    TUTOR_PROFILES {
        int id PK "导学本主键"
        int reader_id FK "读者"
        int book_id FK "图书"
        int book_source_document_id FK "主资料"
        string source_type "来源类型"
        string title "导学标题"
        string status "生成状态"
    }

    TUTOR_SOURCE_DOCUMENTS {
        int id PK "导学资料"
        int profile_id FK "导学本"
        int origin_book_source_document_id FK "原始图书资料"
        string kind "资料类型"
        string parse_status "解析状态"
    }

    TUTOR_DOCUMENT_CHUNKS {
        int id PK "导学切片"
        int profile_id FK "导学本"
        int document_id FK "导学资料"
        int chunk_index "切片序号"
    }

    TUTOR_SESSIONS {
        int id PK "导学会话"
        int profile_id FK "导学本"
        int current_step_index "当前步骤"
        string status "会话状态"
    }

    TUTOR_SESSION_MESSAGES {
        int id PK "导学消息"
        int session_id FK "导学会话"
        string role "消息角色"
    }

    TUTOR_STEP_COMPLETIONS {
        int id PK "步骤完成记录"
        int session_id FK "导学会话"
        int message_id FK "关联消息"
        int step_index "步骤序号"
        float confidence "置信度"
    }

    TUTOR_GENERATION_JOBS {
        int id PK "生成任务"
        int profile_id FK "导学本"
        string job_type "任务类型"
        string status "状态"
    }

    READER_PROFILES ||--o{ TUTOR_PROFILES : "创建导学本"
    BOOKS ||--o{ TUTOR_PROFILES : "作为导学主题"
    BOOK_SOURCE_DOCUMENTS ||--o{ TUTOR_PROFILES : "作为主资料"
    TUTOR_PROFILES ||--o{ TUTOR_SOURCE_DOCUMENTS : "拥有资料"
    BOOK_SOURCE_DOCUMENTS ||--o{ TUTOR_SOURCE_DOCUMENTS : "映射原始资料"
    TUTOR_PROFILES ||--o{ TUTOR_DOCUMENT_CHUNKS : "产生切片"
    TUTOR_SOURCE_DOCUMENTS ||--o{ TUTOR_DOCUMENT_CHUNKS : "被切片"
    TUTOR_PROFILES ||--o{ TUTOR_SESSIONS : "开启导学会话"
    TUTOR_SESSIONS ||--o{ TUTOR_SESSION_MESSAGES : "包含消息"
    TUTOR_SESSIONS ||--o{ TUTOR_STEP_COMPLETIONS : "记录步骤完成"
    TUTOR_SESSION_MESSAGES ||--o{ TUTOR_STEP_COMPLETIONS : "触发步骤判定"
    TUTOR_PROFILES ||--o{ TUTOR_GENERATION_JOBS : "产生生成任务"
```

中文注释：

- `tutor_*` 是旧版导学实现，结构偏传统：资料入库、切片、会话、步骤完成。
- 当前线上主域已经切到 `learning_*`；这部分只保留为历史结构说明，便于理解迁移脚本和旧数据来源。

## 模块七：新版导学域 Learning V2

```mermaid
erDiagram
    LEARNING_SOURCE_BUNDLES {
        int id PK "资料包主键"
        int reader_id FK "读者"
        string title "资料包名称"
    }

    LEARNING_PROFILES {
        int id PK "学习空间主键"
        int reader_id FK "读者"
        int source_bundle_id FK "资料包"
        int active_path_version_id FK "当前路径版本"
        string goal_mode "目标模式"
        string difficulty_mode "难度模式"
        string status "空间状态"
    }

    LEARNING_SOURCE_ASSETS {
        int id PK "资料资产"
        int bundle_id FK "资料包"
        int book_id FK "图书"
        int book_source_document_id FK "图书资料"
        string asset_kind "资产类型"
        string parse_status "解析状态"
    }

    LEARNING_FRAGMENTS {
        int id PK "学习切片"
        int profile_id FK "学习空间"
        int asset_id FK "资料资产"
        int chunk_index "切片序号"
        string fragment_type "切片类型"
    }

    LEARNING_PATH_VERSIONS {
        int id PK "路径版本"
        int profile_id FK "学习空间"
        int version_number "版本号"
        string status "版本状态"
        string graph_provider "图谱来源"
    }

    LEARNING_PATH_STEPS {
        int id PK "路径步骤"
        int path_version_id FK "路径版本"
        int step_index "步骤序号"
        string step_type "步骤类型"
        string title "步骤标题"
    }

    LEARNING_SESSIONS {
        int id PK "学习会话"
        int profile_id FK "学习空间"
        string session_kind "guide/explore"
        int source_session_id FK "来源会话"
        int focus_step_index "聚焦步骤"
        string learning_mode "预习/精读等"
        string status "会话状态"
    }

    LEARNING_TURNS {
        int id PK "学习轮次"
        int session_id FK "学习会话"
        string turn_kind "guide/explore"
        string user_content "用户输入"
        string assistant_content "系统输出"
    }

    LEARNING_STEP_CONTEXT_ITEMS {
        int id PK "步骤补充上下文"
        int guide_session_id FK "Guide 会话"
        int source_session_id FK "Explore 会话"
        int source_turn_id FK "Explore 轮次"
        int step_index "归属步骤"
    }

    LEARNING_BRIDGE_ACTIONS {
        int id PK "桥接动作"
        string action_type "桥接类型"
        int from_session_id FK "来源会话"
        int from_turn_id FK "来源轮次"
        int to_session_id FK "目标会话"
        string status "动作状态"
    }

    LEARNING_AGENT_RUNS {
        int id PK "Agent 运行记录"
        int turn_id FK "所属轮次"
        string agent_name "Agent 名称"
        string status "运行状态"
    }

    LEARNING_CHECKPOINTS {
        int id PK "掌握度检查点"
        int session_id FK "学习会话"
        int turn_id FK "轮次"
        int step_index "步骤序号"
        bool passed "是否通过"
    }

    LEARNING_REMEDIATION_PLANS {
        int id PK "补救计划"
        int session_id FK "学习会话"
        int step_index "步骤序号"
        string status "计划状态"
    }

    LEARNING_REPORTS {
        int id PK "学习报告"
        int session_id FK "学习会话"
        string report_type "报告类型"
    }

    LEARNING_JOBS {
        int id PK "异步任务"
        int profile_id FK "学习空间"
        string job_type "任务类型"
        string status "任务状态"
    }

    READER_PROFILES ||--o{ LEARNING_SOURCE_BUNDLES : "创建资料包"
    READER_PROFILES ||--o{ LEARNING_PROFILES : "创建学习空间"

    LEARNING_SOURCE_BUNDLES ||--o{ LEARNING_PROFILES : "衍生学习空间"
    LEARNING_SOURCE_BUNDLES ||--o{ LEARNING_SOURCE_ASSETS : "包含资料"
    BOOKS ||--o{ LEARNING_SOURCE_ASSETS : "可作为学习资料"
    BOOK_SOURCE_DOCUMENTS ||--o{ LEARNING_SOURCE_ASSETS : "承接图书资料"

    LEARNING_PROFILES ||--o{ LEARNING_FRAGMENTS : "生成切片"
    LEARNING_SOURCE_ASSETS ||--o{ LEARNING_FRAGMENTS : "被切片"

    LEARNING_PROFILES ||--o{ LEARNING_PATH_VERSIONS : "生成路径版本"
    LEARNING_PATH_VERSIONS ||--o{ LEARNING_PATH_STEPS : "包含步骤"
    LEARNING_PATH_VERSIONS ||--o| LEARNING_PROFILES : "被设置为当前版本"

    LEARNING_PROFILES ||--o{ LEARNING_SESSIONS : "开启会话"
    LEARNING_SESSIONS ||--o{ LEARNING_TURNS : "产生轮次"
    LEARNING_SESSIONS ||--o{ LEARNING_SESSIONS : "guide 派生 explore"

    LEARNING_SESSIONS ||--o{ LEARNING_STEP_CONTEXT_ITEMS : "吸收 Explore 结果"
    LEARNING_TURNS ||--o{ LEARNING_STEP_CONTEXT_ITEMS : "被收编为步骤上下文"

    LEARNING_SESSIONS ||--o{ LEARNING_BRIDGE_ACTIONS : "发起桥接动作"
    LEARNING_TURNS ||--o{ LEARNING_BRIDGE_ACTIONS : "作为桥接来源"

    LEARNING_TURNS ||--o{ LEARNING_AGENT_RUNS : "记录多 Agent 运行"
    LEARNING_SESSIONS ||--o{ LEARNING_CHECKPOINTS : "记录掌握度"
    LEARNING_TURNS ||--o{ LEARNING_CHECKPOINTS : "触发掌握度判定"
    LEARNING_SESSIONS ||--o{ LEARNING_REMEDIATION_PLANS : "生成补救计划"
    LEARNING_SESSIONS ||--o{ LEARNING_REPORTS : "生成学习报告"
    LEARNING_PROFILES ||--o{ LEARNING_JOBS : "触发生成任务"
```

中文注释：

- `learning_source_bundles / learning_source_assets`：资料包与资料资产层，承接馆藏书、解析文档和外部材料。
- `learning_fragments`：新版 RAG 切片，支持向量和词法混合检索。
- `learning_path_versions / learning_path_steps`：把“导学路径”实体化，支持版本化。
- `learning_sessions / learning_turns`：统一承载 `Guide` 和 `Explore` 两种会话。
- `learning_step_context_items / learning_bridge_actions`：用于实现 Guide 和 Explore 之间的桥接。
- `learning_agent_runs / learning_checkpoints / learning_remediation_plans / learning_reports`：支撑多智能体导学、掌握度评估、补救和报告。
- `learning_jobs`：生成、解析、图谱构建等任务记录。

## 重点关系解读

### 1. 图书资料如何进入导学域

```text
books
  -> book_source_documents
  -> learning_source_assets
  -> learning_fragments
  -> learning_path_versions / learning_path_steps
  -> learning_sessions
```

含义：

- 图书和资料先在目录层登记。
- 导学域不是直接吃 `books`，而是通过 `book_source_documents` 和 `learning_source_assets` 把资料规范化。
- 只有经过 `fragments` 切片和 `path_versions` 规划后，才会进入真正的导学会话。

### 2. Guide / Explore / Bridge 的核心闭环

```text
guide session
  -> learning_turns (guide)
  -> learning_checkpoints / remediation / reports

guide session
  -> bridge action (expand_step_to_explore)
  -> explore session
  -> learning_turns (explore)
  -> bridge action (attach_explore_turn_to_guide_step)
  -> learning_step_context_items
  -> guide 检索优先召回
```

含义：

- `Guide` 负责步骤推进。
- `Explore` 负责自由问答。
- `Bridge` 不直接推进步骤，而是把自由探索的结果沉淀为后续 Guide 的高优先级证据。

### 3. 导学域收敛策略

```text
tutor_*    -> 已迁移并删除
learning_* -> 当前唯一导学主域
```

含义：

- `tutor_*` 已完成迁移后删除，不再承担真实业务。
- `learning_*` 现在是唯一导学主域，承载 `Guide / Explore / Bridge`。
- 迁移脚本和 Alembic 仅用于把遗留 tutor 数据搬入 learning。
