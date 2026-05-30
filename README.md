# 云南菜价通 — 菜农身边的行情助手

面向菜农的云南菜价可视化 Web 项目，支持：

- 菜价趋势图
- 每日涨幅图
- 历史对比图
- 涨幅红色高亮
- Netlify 自动部署
- 接入农业农村部全国农产品批发市场价格信息系统官方云南行情源
- 自动累积每日历史快照，方便后续观察涨幅走势

## 本地运行

```bash
npm install
npm run dev
```

如果你想联调 Netlify Functions 和历史存储，建议使用 `netlify dev`。

## 构建

```bash
npm run build
```

## 数据源说明

当前项目默认优先读取官方云南行情源：

- 市场树：`/price_portal/sys-user-relation/getTreeByProvinceName`
- 品类树：`/price_portal/sys-user-relation/getVarietiesTree`
- 实时报价：`/price_portal/index/getMarketReportPriceChart`
- 涨幅排行：`/price_portal/index/growthRanking`

实时价格会通过 Netlify Functions 统一适配，前端不会直接请求第三方站点。

如果官方源不可用，项目会自动回退到本地示例数据，保证页面可运行。

## 历史数据

历史曲线由 Netlify Blobs 持久化保存，每次刷新时会更新当天记录。
同时还配置了一个每小时运行的 `snapshot` 定时函数，保证即使没人打开页面，历史曲线也会继续增长。
这样你可以逐步看到：

- 每日菜价变化
- 每日涨幅
- 7 天、30 天、90 天趋势回看

## Netlify 部署

- 连接 GitHub 仓库
- 构建命令：`npm run build`
- 发布目录：`dist`
- Functions 目录：`netlify/functions`
- 建议在 Netlify 环境变量中保持默认即可，无需额外上游 API Key

## 设计目标

- 适合菜农快速查看
- 重点突出云南市场
- 涨幅正数统一红色显示
- 支持后续继续扩展更多品类和市场
