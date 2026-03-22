# Readers 模块设计

## 背景

当前后端已经具备以下能力：

- 认证：`auth`
- 图书与库存：`catalog`、`inventory`
- 借阅与配送：`orders`、`robot_sim`
- 推荐与会话：`recommendation`、`conversation`
- 管理端查询：`admin`

但 `readers` 目前仅有模块入口，尚未承担“围绕读者的一体化查询与资料管理”职责。

现有数据库中，`reader_profiles` 已经是多个业务域的中心：

- `borrow_orders.reader_id`
- `conversation_sessions.reader_id`
- `search_logs.reader_id`
- `recommendation_logs.reader_id`
- `reading_events.reader_id`

因此，`readers` 适合被设计成“读者中心 / Reader Hub”，而不是重复实现登录、下单、会话或推荐生成。

## 目标

建设一个围绕读者展开的聚合模块，覆盖：

1. 管理员查看读者列表和读者详情
2. 管理员查看某个读者的借阅、会话、推荐、搜索概况
3. 读者查看和更新自己的基础资料
4. 读者查看自己的全景概览

## 不做什么

`readers` 不负责以下行为：

- 登录与 token 刷新
- 创建借阅订单
- 发起推荐生成
- 发送会话消息
- 修正订单状态

这些继续由 `auth`、`orders`、`recommendation`、`conversation`、`admin` 负责。

## 方案比较

### 方案 A：轻量资料模块

只提供读者资料的查询和修改：

- `GET /readers/me/profile`
- `PATCH /readers/me/profile`

优点：

- 最简单
- 与现有模块耦合最小

缺点：

- 业务价值偏弱
- 无法支撑管理员 SaaS 场景

### 方案 B：读者中心聚合模块

在资料管理基础上，增加围绕读者的一体化查询：

- 读者列表
- 读者详情
- 读者借阅概览
- 读者推荐/搜索/会话概览

优点：

- 最符合当前数据模型
- 对管理员 Web SaaS 最有价值
- 不与订单、会话、推荐主流程冲突

缺点：

- 需要定义清楚聚合边界

### 方案 C：重型 CRM 模块

加入标签、运营备注、黑名单、人工分组等功能。

优点：

- 未来扩展空间大

缺点：

- 当前阶段过重
- 容易偏离 v1 核心目标

## 选型

采用 **方案 B：读者中心聚合模块**。

## 模块边界

### `readers` 负责

- 读者资料查询
- 读者资料修改
- 读者维度聚合查询
- 读者全景概览

### `readers` 不负责

- 认证发 token
- 订单写入
- 会话写入
- 推荐计算
- 审计写入

## API 设计

### 读者自助接口

- `GET /api/v1/readers/me/profile`
  - 返回自己的资料
- `PATCH /api/v1/readers/me/profile`
  - 更新 `display_name / affiliation_type / college / major / grade_year`
- `GET /api/v1/readers/me/overview`
  - 返回自己的聚合概览
- `GET /api/v1/readers/me/orders`
  - 返回自己的借阅与配送列表

### 管理员接口

- `GET /api/v1/readers`
  - 读者列表，支持基础搜索
- `GET /api/v1/readers/{reader_id}`
  - 读者详情
- `GET /api/v1/readers/{reader_id}/overview`
  - 管理员看某个读者的全景概览
- `GET /api/v1/readers/{reader_id}/orders`
  - 某读者的借阅/配送记录
- `GET /api/v1/readers/{reader_id}/conversations`
  - 某读者的会话列表
- `GET /api/v1/readers/{reader_id}/recommendations`
  - 某读者的推荐记录

## 概览接口建议返回的数据

### `me/overview`

- `profile`
- `active_orders_count`
- `borrow_history_count`
- `recent_orders`
- `recent_queries`
- `recent_recommendations`
- `recent_sessions`
- `recent_reading_events`

### `/{reader_id}/overview`

在 `me/overview` 基础上增加：

- `search_count`
- `conversation_count`
- `recommendation_count`
- `last_active_at`

## 页面映射

### 管理员 SaaS

- 读者列表页
  - 来源：`GET /api/v1/readers`
- 读者详情页
  - 来源：`GET /api/v1/readers/{reader_id}`
- 读者借阅标签页
  - 来源：`GET /api/v1/readers/{reader_id}/orders`
- 读者会话标签页
  - 来源：`GET /api/v1/readers/{reader_id}/conversations`
- 读者推荐标签页
  - 来源：`GET /api/v1/readers/{reader_id}/recommendations`
- 读者总览页
  - 来源：`GET /api/v1/readers/{reader_id}/overview`

### 读者侧

- 我的资料
  - 来源：`GET /PATCH /api/v1/readers/me/profile`
- 我的主页
  - 来源：`GET /api/v1/readers/me/overview`
- 我的借阅
  - 来源：`GET /api/v1/readers/me/orders`

## 权限模型

### 读者

- 只能访问 `me/*`
- 只能读写自己的 profile
- 只能查看自己的 orders / overview

### 管理员

- 可查看任意读者资料
- 可查看任意读者借阅、会话、推荐、搜索聚合
- 不可通过 `readers` 模块修改读者借阅或会话内容

## 数据来源

`readers` 自己不新增大表，主要聚合以下表：

- `reader_accounts`
- `reader_profiles`
- `borrow_orders`
- `delivery_orders`
- `conversation_sessions`
- `conversation_messages`
- `search_logs`
- `recommendation_logs`
- `reading_events`

## 错误处理

- 非法 reader id：`404`
- 读者访问他人资源：`403`
- profile 不存在：`404`
- 空更新负载：`400`

## 测试重点

- 读者只能访问自己的 `me/*`
- 管理员可以查看任意读者信息
- 管理员不能通过 `readers` 修改订单或会话
- `overview` 聚合字段返回正确
- 列表筛选与空状态正确

## 结论

`readers` 最适合做成“读者中心聚合模块”，它把现有多个域围绕读者聚合起来，服务管理员 SaaS 和读者自助两端，同时避免与 `auth / orders / conversation / recommendation` 的写路径重叠。
