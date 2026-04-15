# Service Branch 数据库现状与 ER 图

更新时间：2026-04-15（Asia/Shanghai）

## 数据口径

本文分成两个口径：

- `service` 已提交 HEAD：`6b382f6412afb7e79d345693052b34538f8d8979`，提交时间 `2026-04-14 20:07:35 +0800`，共 `46` 张表，教学域仍使用 `tutor_*`。
- `service` 当前 worktree 最新态：本地存在未提交的迁移与模型变更，共 `54` 张活动表，教学域已切换为 `learning_*`，并准备退役 `tutor_*`。

当前 worktree 里与数据库直接相关的新增迁移：

- `alembic/versions/20260414_02_learning_v2_schema.py`
- `alembic/versions/20260415_01_retire_tutor_schema.py`

本文后续 ER 图默认以“当前 worktree 最新态”作为主口径，因为你问的是“目前最新的数据库”。

## 快速结论

- 当前最新活动表数量：`54`
- 相比 `service` HEAD，新增 `15` 张 `learning_*` 表
- 相比 `service` HEAD，退役 `7` 张 `tutor_*` 表
- 相比 `service` HEAD，净增 `8` 张表

教学域迁移关系：

- `tutor_profiles` -> `learning_source_bundles` + `learning_profiles` + `learning_path_versions`
- `tutor_source_documents` -> `learning_source_assets`
- `tutor_document_chunks` -> `learning_fragments`
- `tutor_sessions` / `tutor_session_messages` -> `learning_sessions` / `learning_turns`
- `tutor_step_completions` -> `learning_checkpoints`
- `tutor_generation_jobs` -> `learning_jobs`

## 模块分布

- 后台与系统：`admin_*`、`alert_records`、`system_settings`、`recommendation_placements`、`recommendation_studio_publications`
- 读者与书单：`reader_*`、`favorite_books`、`dismissed_notifications`、`topic_booklists*`
- 图书目录：`books`、`book_categories`、`book_tags`、`book_tag_links`、`book_source_documents`
- 库存与借阅：`cabinets`、`cabinet_slots`、`book_copies`、`book_stock`、`inventory_events`、`borrow_orders`、`order_fulfillments`、`return_requests`
- 机器人履约：`robot_units`、`robot_tasks`、`robot_status_events`
- 推荐、行为与会话：`recommendation_logs`、`reading_events`、`search_logs`、`conversation_sessions`、`conversation_messages`
- 学习域：`learning_*`

## 模块一：后台、权限与系统配置

```mermaid
erDiagram
    admin_accounts {
        int id PK "管理员主键"
        string username "登录账号"
        string password_hash "密码哈希"
    }

    admin_action_logs {
        int id PK "操作日志主键"
        int admin_id FK "操作人"
        string target_type "对象类型"
        string target_ref "对象标识"
        string action "动作"
    }

    admin_roles {
        int id PK "角色主键"
        string code "角色编码"
        string name "角色名"
    }

    admin_permissions {
        int id PK "权限主键"
        string code "权限编码"
        string name "权限名"
    }

    admin_role_assignments {
        int id PK "管理员角色分配"
        int admin_id FK "管理员"
        int role_id FK "角色"
    }

    admin_role_permissions {
        int id PK "角色权限关联"
        int role_id FK "角色"
        int permission_id FK "权限"
    }

    alert_records {
        int id PK "告警主键"
        string source_type "告警来源类型"
        string alert_type "告警类型"
        string severity "严重程度"
        string status "处理状态"
        int acknowledged_by FK "确认人"
        int resolved_by FK "解决人"
    }

    recommendation_placements {
        int id PK "推荐位主键"
        string code "推荐位编码"
        string name "推荐位名称"
        string placement_type "投放场景"
        string status "启用状态"
    }

    recommendation_studio_publications {
        int id PK "推荐发布记录"
        int version "发布版本"
        string status "发布状态"
        int published_by FK "发布管理员"
    }

    system_settings {
        int id PK "系统配置主键"
        string setting_key "配置键"
        string value_type "值类型"
        int created_by FK "创建管理员"
        int updated_by FK "更新管理员"
    }

    admin_accounts ||--o{ admin_action_logs : "记录操作"
    admin_accounts ||--o{ admin_role_assignments : "绑定角色"
    admin_roles ||--o{ admin_role_assignments : "分配给管理员"
    admin_roles ||--o{ admin_role_permissions : "拥有权限"
    admin_permissions ||--o{ admin_role_permissions : "被角色引用"
    admin_accounts ||--o{ alert_records : "确认/解决告警"
    admin_accounts ||--o{ recommendation_studio_publications : "发布推荐配置"
    admin_accounts ||--o{ system_settings : "维护系统设置"
```

说明：

- `admin_accounts` 是后台统一身份中心。
- `admin_roles` / `admin_permissions` / `admin_role_*` 是标准 RBAC 权限模型。
- `alert_records`、`system_settings`、推荐位配置都挂在管理员体系下。

## 模块二：读者、书单与图书目录

```mermaid
erDiagram
    reader_accounts {
        int id PK "读者账号主键"
        string username "登录账号"
    }

    reader_profiles {
        int id PK "读者画像主键"
        int account_id FK "所属账号"
        string display_name "昵称"
        string affiliation_type "身份类型"
        string college "学院"
        string major "专业"
        string segment_code "分群编码"
    }

    reader_booklists {
        int id PK "读者书单主键"
        int reader_id FK "所属读者"
        string title "书单标题"
    }

    reader_booklist_items {
        int id PK "读者书单明细"
        int booklist_id FK "所属书单"
        int book_id FK "图书"
        int rank_position "排序"
    }

    favorite_books {
        int id PK "收藏记录主键"
        int reader_id FK "读者"
        int book_id FK "图书"
    }

    dismissed_notifications {
        int id PK "已忽略通知"
        int reader_id FK "读者"
        string notification_id "通知标识"
    }

    topic_booklists {
        int id PK "专题书单主键"
        string slug "专题标识"
        string title "专题标题"
        string status "状态"
        string audience_segment "目标人群"
    }

    topic_booklist_items {
        int id PK "专题书单明细"
        int topic_booklist_id FK "专题书单"
        int book_id FK "图书"
        int rank_position "排序"
    }

    book_categories {
        int id PK "图书分类主键"
        string code "分类编码"
        string name "分类名称"
        string status "状态"
    }

    books {
        int id PK "图书主键"
        int category_id FK "分类"
        string title "书名"
        string author "作者"
        string isbn "ISBN"
        string barcode "条码"
        string shelf_status "馆藏状态"
    }

    book_source_documents {
        int id PK "图书资料主键"
        int book_id FK "所属图书"
        string source_kind "资料类型"
        string file_name "文件名"
        string parse_status "解析状态"
        bool is_primary "是否主资料"
    }

    book_tags {
        int id PK "标签主键"
        string code "标签编码"
        string name "标签名"
    }

    book_tag_links {
        int id PK "图书标签关联"
        int book_id FK "图书"
        int tag_id FK "标签"
    }

    reader_accounts ||--|| reader_profiles : "账号对应画像"
    reader_profiles ||--o{ reader_booklists : "拥有书单"
    reader_booklists ||--o{ reader_booklist_items : "包含图书"
    books ||--o{ reader_booklist_items : "被加入书单"
    reader_profiles ||--o{ favorite_books : "收藏图书"
    books ||--o{ favorite_books : "被收藏"
    reader_profiles ||--o{ dismissed_notifications : "忽略通知"
    topic_booklists ||--o{ topic_booklist_items : "包含图书"
    books ||--o{ topic_booklist_items : "进入专题"
    book_categories ||--o{ books : "分类图书"
    books ||--o{ book_source_documents : "拥有资料"
    books ||--o{ book_tag_links : "关联标签"
    book_tags ||--o{ book_tag_links : "被图书引用"
```

说明：

- `reader_accounts` 与 `reader_profiles` 是一对一，账号与画像分离。
- 图书目录主实体是 `books`，分类、标签、资料文档都围绕它展开。
- 书单分为读者自建书单 `reader_booklists` 与运营专题书单 `topic_booklists` 两套。

## 模块三：库存、借阅与机器人履约

```mermaid
erDiagram
    cabinets {
        string id PK "书柜主键"
        string name "书柜名称"
        string location "位置"
        string status "书柜状态"
    }

    cabinet_slots {
        int id PK "槽位主键"
        string cabinet_id FK "所属书柜"
        string slot_code "槽位编码"
        string status "槽位状态"
    }

    book_copies {
        int id PK "图书副本主键"
        int book_id FK "图书"
        int current_slot_id FK "当前槽位"
        string inventory_status "副本状态"
    }

    book_stock {
        int id PK "库存汇总主键"
        int book_id FK "图书"
        string cabinet_id FK "书柜"
        int total_copies "总册数"
        int available_copies "可借册数"
        int reserved_copies "已预留册数"
    }

    inventory_events {
        int id PK "库存事件主键"
        string cabinet_id FK "书柜"
        string event_type "事件类型"
        int book_id FK "图书"
        int copy_id FK "副本"
    }

    borrow_orders {
        int id PK "借阅单主键"
        int reader_id FK "下单读者"
        int requested_book_id FK "请求图书"
        int fulfilled_copy_id FK "分配副本"
        string fulfillment_mode "履约模式"
        string status "订单状态"
    }

    order_fulfillments {
        int id PK "履约记录主键"
        int borrow_order_id FK "借阅单"
        string source_cabinet_id FK "取书书柜"
        int source_slot_id FK "取书槽位"
        string status "履约状态"
    }

    return_requests {
        int id PK "归还申请主键"
        int borrow_order_id FK "借阅单"
        int copy_id FK "归还副本"
        string receive_cabinet_id FK "回收书柜"
        int receive_slot_id FK "回收槽位"
        int processed_by_admin_id FK "处理管理员"
        string status "归还状态"
    }

    robot_units {
        int id PK "机器人主键"
        string code "机器人编码"
        string status "机器人状态"
    }

    robot_tasks {
        int id PK "机器人任务主键"
        int robot_id FK "机器人"
        int fulfillment_id FK "履约记录"
        int reassigned_from_task_id FK "来自旧任务"
        int superseded_by_task_id FK "被新任务取代"
        string status "任务状态"
        bool is_current "是否当前任务"
    }

    robot_status_events {
        int id PK "机器人状态事件"
        int robot_id FK "机器人"
        int task_id FK "任务"
        string event_type "事件类型"
    }

    cabinets ||--o{ cabinet_slots : "包含槽位"
    books ||--o{ book_copies : "拥有副本"
    cabinet_slots ||--o{ book_copies : "存放副本"
    books ||--o{ book_stock : "形成库存汇总"
    cabinets ||--o{ book_stock : "按柜汇总库存"
    cabinets ||--o{ inventory_events : "产生库存事件"
    books ||--o{ inventory_events : "参与库存事件"
    book_copies ||--o{ inventory_events : "参与库存事件"
    reader_profiles ||--o{ borrow_orders : "发起借阅"
    books ||--o{ borrow_orders : "被请求借阅"
    book_copies ||--o{ borrow_orders : "用于履约"
    borrow_orders ||--o{ order_fulfillments : "生成履约记录"
    cabinets ||--o{ order_fulfillments : "提供取书位置"
    cabinet_slots ||--o{ order_fulfillments : "提供取书槽位"
    borrow_orders ||--o{ return_requests : "产生归还申请"
    book_copies ||--o{ return_requests : "作为归还副本"
    cabinets ||--o{ return_requests : "接收归还"
    cabinet_slots ||--o{ return_requests : "接收归还槽位"
    admin_accounts ||--o{ return_requests : "处理归还"
    order_fulfillments ||--o{ robot_tasks : "触发机器人任务"
    robot_units ||--o{ robot_tasks : "执行任务"
    robot_units ||--o{ robot_status_events : "产生状态事件"
    robot_tasks ||--o{ robot_status_events : "关联状态事件"
```

说明：

- `book_copies` 是“单册实体”，`book_stock` 是“按书柜汇总的库存快照”。
- `borrow_orders` 是读者借阅主单，`order_fulfillments` 是履约过程，`robot_tasks` 是机器人执行层。
- `return_requests` 同时连接借阅单、册、副本回收点和管理员处理人。

## 模块四：推荐、行为分析与对话会话

```mermaid
erDiagram
    reading_events {
        int id PK "阅读行为事件"
        int reader_id FK "读者"
        string event_type "事件类型"
    }

    search_logs {
        int id PK "检索日志主键"
        int reader_id FK "读者"
        string query_text "检索词"
        string query_mode "检索模式"
    }

    recommendation_logs {
        int id PK "推荐日志主键"
        int reader_id FK "读者"
        int book_id FK "命中图书"
        string query_text "请求内容"
        int rank_position "排序"
        float score "得分"
        string provider_note "来源说明"
    }

    conversation_sessions {
        int id PK "对话会话主键"
        int reader_id FK "读者"
        string status "会话状态"
    }

    conversation_messages {
        int id PK "对话消息主键"
        int session_id FK "会话"
        string role "角色"
        string content "消息内容"
    }

    reader_profiles ||--o{ reading_events : "产生阅读行为"
    reader_profiles ||--o{ search_logs : "发起搜索"
    reader_profiles ||--o{ recommendation_logs : "接收推荐"
    books ||--o{ recommendation_logs : "进入推荐结果"
    reader_profiles ||--o{ conversation_sessions : "开启对话"
    conversation_sessions ||--o{ conversation_messages : "包含消息"
```

说明：

- `reading_events`、`search_logs`、`recommendation_logs` 是行为分析与推荐效果评估的基础日志。
- `conversation_sessions` / `conversation_messages` 提供面向读者的自然语言会话上下文。

## 模块五：Learning 资料、路径与作业

```mermaid
erDiagram
    learning_source_bundles {
        int id PK "学习资料包主键"
        int reader_id FK "所属读者"
        string title "资料包标题"
    }

    learning_profiles {
        int id PK "学习空间主键"
        int reader_id FK "所属读者"
        int source_bundle_id FK "资料包"
        int active_path_version_id FK "当前激活路径版本"
        string goal_mode "学习目标模式"
        string difficulty_mode "难度模式"
        string status "状态"
        string title "学习空间标题"
    }

    learning_source_assets {
        int id PK "学习素材主键"
        int bundle_id FK "资料包"
        int book_id FK "来源图书"
        int book_source_document_id FK "来源图书资料"
        string asset_kind "素材类型"
        string parse_status "解析状态"
    }

    learning_fragments {
        int id PK "学习切片主键"
        int profile_id FK "学习空间"
        int asset_id FK "学习素材"
        int chunk_index "切片序号"
        string fragment_type "切片类型"
    }

    learning_path_versions {
        int id PK "学习路径版本主键"
        int profile_id FK "学习空间"
        int version_number "版本号"
        string status "路径状态"
        string title "路径标题"
    }

    learning_path_steps {
        int id PK "学习路径步骤主键"
        int path_version_id FK "路径版本"
        int step_index "步骤序号"
        string step_type "步骤类型"
        string title "步骤标题"
    }

    learning_jobs {
        int id PK "学习任务主键"
        int profile_id FK "学习空间"
        string job_type "任务类型"
        string status "任务状态"
        int attempt_count "尝试次数"
    }

    reader_profiles ||--o{ learning_source_bundles : "创建资料包"
    reader_profiles ||--o{ learning_profiles : "创建学习空间"
    learning_source_bundles ||--o{ learning_profiles : "供学习空间引用"
    learning_source_bundles ||--o{ learning_source_assets : "包含素材"
    books ||--o{ learning_source_assets : "作为素材来源"
    book_source_documents ||--o{ learning_source_assets : "作为文档来源"
    learning_profiles ||--o{ learning_fragments : "拥有切片"
    learning_source_assets ||--o{ learning_fragments : "被切分为片段"
    learning_profiles ||--o{ learning_path_versions : "拥有路径版本"
    learning_profiles o|--|| learning_path_versions : "active_path_version_id 当前激活版本"
    learning_path_versions ||--o{ learning_path_steps : "包含步骤"
    learning_profiles ||--o{ learning_jobs : "产生异步任务"
```

说明：

- `learning_source_bundles` 是读者维度的学习资料容器。
- `learning_profiles` 是新版教学/学习主实体，代替旧 `tutor_profiles`。
- `learning_source_assets` 对接书籍与书籍资料，`learning_fragments` 存放切片、检索文本和向量。
- `learning_path_versions` / `learning_path_steps` 表示学习路径及其版本化步骤。

## 模块六：Learning 会话、桥接与评估

```mermaid
erDiagram
    learning_sessions {
        int id PK "学习会话主键"
        int profile_id FK "学习空间"
        string learning_mode "学习模式"
        string session_kind "guide 或 explore"
        int source_session_id FK "来源 guide 会话"
        int focus_step_index "聚焦步骤"
        string status "会话状态"
        float mastery_score "掌握度"
    }

    learning_turns {
        int id PK "学习轮次主键"
        int session_id FK "所属会话"
        string turn_kind "轮次类型"
    }

    learning_step_context_items {
        int id PK "步骤上下文主键"
        int guide_session_id FK "导学会话"
        int source_session_id FK "来源会话"
        int source_turn_id FK "来源轮次"
        int step_index "步骤序号"
        string title "上下文标题"
    }

    learning_bridge_actions {
        int id PK "桥接动作主键"
        int from_session_id FK "来源会话"
        int from_turn_id FK "来源轮次"
        int to_session_id FK "目标会话"
        string action_type "桥接动作类型"
        string status "执行状态"
    }

    learning_agent_runs {
        int id PK "代理运行主键"
        int turn_id FK "所属轮次"
        string agent_name "代理名"
        string status "运行状态"
    }

    learning_checkpoints {
        int id PK "学习检查点主键"
        int session_id FK "所属会话"
        int turn_id FK "触发轮次"
        int step_index "步骤序号"
        float mastery_score "掌握度"
        bool passed "是否通过"
    }

    learning_remediation_plans {
        int id PK "补救计划主键"
        int session_id FK "所属会话"
        int step_index "步骤序号"
        string status "补救状态"
    }

    learning_reports {
        int id PK "学习报告主键"
        int session_id FK "所属会话"
        string report_type "报告类型"
    }

    learning_profiles ||--o{ learning_sessions : "开启学习会话"
    learning_sessions ||--o{ learning_turns : "包含轮次"
    learning_sessions ||--o{ learning_step_context_items : "沉淀/引用上下文"
    learning_sessions ||--o{ learning_bridge_actions : "作为桥接来源/目标"
    learning_turns ||--o{ learning_bridge_actions : "触发桥接"
    learning_turns ||--o{ learning_agent_runs : "驱动多代理运行"
    learning_sessions ||--o{ learning_checkpoints : "产生检查点"
    learning_turns ||--o{ learning_checkpoints : "关联检查点"
    learning_sessions ||--o{ learning_remediation_plans : "形成补救计划"
    learning_sessions ||--o{ learning_reports : "输出学习报告"
    learning_sessions ||--o{ learning_sessions : "guide 派生 explore"
```

说明：

- `learning_sessions` 已经显式支持 `guide` 与 `explore` 两类会话，并用 `source_session_id` 做桥接。
- `learning_turns` 是学习对话轮次，`learning_agent_runs` 记录 teacher、peer 等代理运行。
- `learning_checkpoints`、`learning_remediation_plans`、`learning_reports` 共同组成评估闭环。

## Legacy：service HEAD 中仍存在、当前最新态准备退役的 Tutor 表

`service` 已提交 HEAD 里，以下 `7` 张表仍然存在：

- `tutor_profiles`
- `tutor_source_documents`
- `tutor_document_chunks`
- `tutor_sessions`
- `tutor_session_messages`
- `tutor_step_completions`
- `tutor_generation_jobs`

对应关系：

- `tutor_profiles`：旧版导学主实体，对应新版 `learning_profiles`
- `tutor_source_documents`：旧版导学资料，对应新版 `learning_source_assets`
- `tutor_document_chunks`：旧版向量切片，对应新版 `learning_fragments`
- `tutor_sessions` / `tutor_session_messages`：旧版导学对话，对应新版 `learning_sessions` / `learning_turns`
- `tutor_step_completions`：旧版步骤完成度，对应新版 `learning_checkpoints`
- `tutor_generation_jobs`：旧版导学生成任务，对应新版 `learning_jobs`

## 结论

- 如果你要看“`service` 分支已提交版本”的数据库，请以 `46` 张表、`tutor_*` 仍存在为准。
- 如果你要看“`service` 当前最新工作态”的数据库，请以 `54` 张活动表、`learning_*` 已接管教学域为准。
- 从业务主线看，数据库主干依旧是 `读者 -> 图书目录 -> 库存/借阅 -> 机器人履约`。
- 增量最大、变化最快的是教学域，也就是 `Tutor（旧） -> Learning（新）`。
