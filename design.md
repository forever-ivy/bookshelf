# Bookshelf App 非导学页面设计规范

## 1. 适用范围

本规范基于当前已实现页面整理，适用于以下非导学区域：

- 首页 `app/(tabs)/(home)`
- 找书 `app/(tabs)/search`
- 借阅 `app/(tabs)/borrowing`
- 收藏页 `app/favorites`
- 我的 `app/(tabs)/me`
- 借阅档案 `app/profile.tsx`
- 图书详情 `app/books/[bookId].tsx`
- 订单详情 `app/orders/[orderId].tsx`

本规范不包含：

- 导学主 tab `app/(tabs)/learning`
- 导学工作区 `/app/learning/[profileId]/*`

## 2. 总体设计原则

- 视觉基调是轻、静、偏阅读，不做强品牌色压迫感界面。
- 信息组织是分段式、单列式、可连续滚动阅读，不做密集 dashboard。
- 白色内容卡是核心载体，页面靠卡片层级而不是复杂背景制造结构。
- 颜色主要承担语义提示，不承担大面积装饰。
- 交互优先原生感和任务清晰度，少做炫技型视觉效果。

## 3. 视觉设计规范

### 3.1 颜色规范

- 页面底色使用浅纸感中性色：
  - `background` / `backgroundTask`：常规任务页底色
  - `backgroundWorkspace`：资料或工作区类页面底色
- 内容卡统一优先使用 `surface` / `surfaceTask` / `surfaceDiscovery`。
- 主强调色统一使用蓝灰系：
  - `primaryStrong` 作为主强调
  - `primarySoft` 作为主强调色浅底
- 状态色只用于局部语义：
  - 绿色：可借、成功、正向状态
  - 蓝色：自取、系统动作、资料类强调
  - 棕橙：警示、即将到期、风险提示
- 辅助浅色如 `accentMint`、`accentLavender`、`warningSoft` 仅用于 chip、辅助块、局部卡片背景，不作为整页主色。

来源：`constants/app-theme.ts`

### 3.2 圆角与阴影规范

- 页面主卡片常用圆角：
  - 常规卡片：`lg = 18`
  - 强调卡片 / 大容器：`xl = 24`
  - 胶囊按钮 / chip：`pill = 999`
- 阴影非常克制：
  - 普通卡片仅轻阴影 `card`
  - 浮层或强操作按钮才使用 `float`
- 不使用厚重投影，不使用悬浮感很强的 material 风格。

### 3.3 间距规范

- 页面左右留白默认由 `PageShell` 提供，统一为 `xl = 24`。
- section 与 section 之间主间距为 `xxl = 32`。
- 卡片内部内容主间距多使用：
  - `lg = 16`
  - `md = 12`
  - `sm = 8`
- 整体观感是“宽松、可读、留白明确”，不要压缩成信息密集排版。

### 3.4 字体层级规范

- 页级标题：
  - `PageShell pageTitle`: 32 / lineHeight 38
  - toolbar inline title: 30 / lineHeight 36
- section 标题：
  - `SectionTitle`: 20
- 卡片标题：
  - 常见 15-18
- 正文说明：
  - 常见 13-14
  - 行高普遍 18-22
- 大标题普遍带轻微负字距，正文用常规字距，整体偏 editorial。

来源：

- `components/navigation/page-shell.tsx`
- `components/navigation/toolbar-header-row.tsx`
- `components/base/section-title.tsx`

### 3.5 插画与情绪内容规范

- 插画用于：
  - 首页 hero 区
  - 空态
  - 任务完成后的情绪缓冲区
- 插画不与主业务信息争主次，通常独立成一个 section 或嵌入空态容器。
- 插画高度通常在 168-248 之间，属于中等体量视觉，不占满首屏。

## 4. 页面结构规范

### 4.1 页面壳层

所有非导学页面优先使用 `PageShell` 作为统一壳层。

- `mode="discovery"`：首页、偏发现内容页
- `mode="task"`：找书、借阅、收藏、我的等任务页
- `mode="workspace"`：档案、详情、流程类页面

默认规范：

- 单列纵向滚动
- 顶部自动安全区处理
- 页面整体 section gap 统一
- 底部预留滚动安全空间

不建议每个页面自己重新实现顶层 `ScrollView` 与通用留白。

### 4.2 页头规范

- 一级 tab 页面采用大标题 header。
- iOS 下 header 会随着滚动在阈值内显示/隐藏，形成“顶部清爽，回到顶部显标题”的体验。
- 页头右侧统一是个人中心入口，不引入多套页头行为模型。
- 二级详情页优先使用 `PageShell pageTitle` 表达页面标题。

来源：

- `app/(tabs)/search/index.tsx`
- `app/(tabs)/borrowing/index.tsx`
- `hooks/use-header-chrome-visibility.ts`

### 4.3 section 组织规范

页面主体由多个 section 构成，每个 section 推荐结构为：

1. `SectionTitle`
2. 一个主卡片或主列表容器
3. 可选的补充说明 / CTA / 空态

常见 section 形态：

- 标题 + 单卡片
- 标题 + 列表容器
- 标题 + 横向 chip strip
- 标题 + 插画 + 状态卡

不建议出现没有标题、直接连续堆叠多个异质卡片的情况。

### 4.4 卡片容器规范

非导学区域里的主卡片普遍遵循以下结构：

- 白底或浅语义底
- 1px 边框
- 18 或 24 圆角
- 内边距 16 或 24
- 内容区内部用 `gap` 控制层级

列表型卡片容器的典型模式：

- 外层一个统一圆角卡片
- 内部 row 之间使用顶部边线分隔
- 首项不加分隔线
- `overflow: hidden`

这一模式已被搜索结果、收藏列表、提醒列表等多处复用。

## 5. 组件使用规范

### 5.1 `PageShell`

用途：

- 页面顶层壳层
- 统一背景、留白、滚动行为和页级标题

使用规则：

- 新页面默认先选 `PageShell`
- 先决定 `mode`，再决定是否传 `pageTitle`
- 需要 header 跟随滚动显隐时，把 `onScroll` 传入 `PageShell`
- 不要在页面 body 内再次手写一套页级大标题

### 5.2 `SectionTitle`

用途：

- 所有 section 的统一标题组件

使用规则：

- 有标题就优先用 `SectionTitle`
- 需要补充说明时用 `description`
- 需要弱标签时用 `eyebrow`
- 避免 section 顶部手写散乱的 `Text` 组合

### 5.3 `PillButton`

用途：

- 页面主 CTA、次 CTA、轻操作统一按钮

推荐 variant：

- `soft`
  - 默认按钮
  - 页内普通动作
- `accent`
  - 次强调
  - “提交反馈 / 继续 / 发起”类动作
- `glass`
  - 详情页辅助操作
  - 不抢主视觉
- `prominent`
  - 极强主行动
  - 非导学区当前使用较少，应谨慎使用

使用规则：

- 不要额外造一套新的按钮视觉
- 宽按钮优先 `fullWidth`
- 首屏或主流程 CTA 可以使用 `size="hero"`

### 5.4 `StateMessageCard`

用途：

- 错误态
- 信息提示
- 空态说明

tone 约定：

- `default`：普通说明
- `info`：服务降级、补充提示
- `danger`：接口失败、加载失败、联调失败

使用规则：

- 状态信息优先用卡片，不直接裸写红字提示
- 空态通常与插画组合使用
- 错误文案在语气上保持平和、可恢复

### 5.5 `SearchFilterStrip`

用途：

- 横向筛选 chip 规范组件

使用规则：

- 适用于分类、馆藏筛选、收藏筛选等横向过滤
- active 态通过浅底 + 描边 + 外壳包裹表达
- 不做重色实心 tab
- 若是主筛选项，可使用 `primaryFilterKey`

### 5.6 `SearchResultCard`

用途：

- 非导学区域中书籍类内容的标准 row / card 组件

使用规则：

- 列表场景优先使用 `variant="list"`
- 卡片场景使用 `variant="card"`
- 收藏页已经证明它可以作为标准书籍 row 复用
- 若是分组列表，必须正确传 `listPosition`

### 5.7 领域组件优先级

当页面属于特定业务域时，优先复用领域组件，而不是重新拼通用卡片：

- 借阅总览：`BorrowingSummary`
- 借阅单项：`BorrowingCard`
- 收藏内容：`FavoritesTabContent` / `FavoritesLibraryScreen`
- 档案内容：`ProfileSummaryCard` 等资料型卡片

原则是：先找领域组件，其次才是通用卡片组合。

## 6. 典型页面模式

### 6.1 首页模式

首页采用 discovery 风格，结构是：

1. 顶部问候 / 标签
2. 插画
3. 快速开始卡
4. 推荐借阅
5. 专题书单

特点：

- 内容更偏发现和引导
- 卡片之间允许有轻量情绪化表达
- 仍然保持白卡 + 轻分段，不走信息流瀑布风格

### 6.2 找书 / 收藏模式

找书与收藏已经形成统一结构：

1. 筛选 strip
2. 结果列表容器
3. 空态 / 错误态 / 反馈动作

特点：

- 筛选独立成 section
- 结果统一放在一个大容器内
- 空态通过插画 + 状态卡表达

### 6.3 借阅模式

借阅页结构更偏任务中心：

1. 顶部页面内 tab
2. 汇总概览卡
3. 订单筛选
4. 订单列表
5. 插画或提醒卡

特点：

- 首先给任务状态总览
- 然后给筛选与操作
- 列表中的动作直接、明确、可执行

### 6.4 我的 / 档案模式

“我的”和“借阅档案”偏资料页，结构更偏“信息面板”：

1. 提醒或摘要
2. 个人资料卡
3. 数据概览
4. 最近使用记录
5. 退出登录 / 辅助动作

特点：

- 不强调复杂交互
- 更强调信息清晰和阅读节奏
- 模块卡片化明显

### 6.5 图书详情 / 订单详情模式

详情页结构偏流程与决策支持：

- 顶部标题明确
- 主信息卡先回答“这是什么”
- 第二层回答“当前状态如何”
- 第三层给“下一步动作”

这类页面特别适合：

- `SectionTitle + 主卡片 + CTA`
- 语义色状态标签
- 轻量说明块

## 7. Do / Don't

### Do

- 使用 `appTheme` 中已有 token
- 页面从 `PageShell` 开始搭建
- 用 `SectionTitle` 管理 section 层级
- 让卡片承担信息组织职责
- 用 `PillButton` 统一按钮语言
- 用 `StateMessageCard` 统一状态表达
- 用横向 chip strip 表达筛选

### Don't

- 不要新做一套深色、高饱和、重品牌背景
- 不要把页面做成密集 dashboard
- 不要在同一页面混入多套按钮样式
- 不要在 body 顶部手写第二套页级标题
- 不要把状态信息直接写成零散文本
- 不要让插画与主业务信息争主次

## 8. 后续延展建议

- 如果后续要给导学区补规范，应尽量复用本规范中的壳层、标题、卡片、按钮、状态组件语言。
- 导学区可以有自己的工作区结构，但不建议脱离当前非导学区已经形成的“轻原生 + 卡片化 + 阅读式布局”基线。
- 若后续新增 tab，优先判断其更接近：
  - `discovery`
  - `task`
  - `workspace`

## 9. 关键参考文件

- `constants/app-theme.ts`
- `components/navigation/page-shell.tsx`
- `components/base/section-title.tsx`
- `components/base/pill-button.tsx`
- `components/base/state-message-card.tsx`
- `components/search/search-filter-strip.tsx`
- `components/search/search-result-card.tsx`
- `app/(tabs)/(home)/index.tsx`
- `components/search/search-screen.tsx`
- `app/(tabs)/borrowing/index.tsx`
- `components/favorites/favorites-library-screen.tsx`
- `components/me/me-screen-content.tsx`
- `app/profile.tsx`
- `app/books/[bookId].tsx`
- `app/orders/[orderId].tsx`
