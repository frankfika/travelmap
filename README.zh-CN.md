# TravelTally · 我的旅行足迹

> 一个私人的、视觉精美的、开源的旅行足迹地图。
> Light up every city you've been — privately, beautifully, yours forever.

![MIT License](https://img.shields.io/badge/license-MIT-green)
![Vite + React 19](https://img.shields.io/badge/stack-Vite%20%2B%20React%2019-blue)
![Private](https://img.shields.io/badge/privacy-100%25%20local-orange)

---

## ✨ 特性

- ⚡ **30 秒点亮整张地图** — 首次打开是一张 34 格的省份网格，点几下地图立刻亮起来，不用一条条录入
- 🖌️ **区域刷亮（涂鸦式）** — 去过一个地方就把它**整个行政区域**刷亮，不是一个孤零零的点。中国支持 **省 → 市 → 县** 三级下钻，国外城市同样会自动铺满边界
- 🏅 **成就与进度** — 13 个徽章：四大直辖市、沿海走廊、五大自治区、国土 10%、跨越赤道… 解锁时即时提示
- 🔗 **只读分享链接** — 生成一条链接把地图给别人看，或对比两个人的重合度。链接里只有「去过哪」，笔记照片不出本机
- 🎯 **挑战** — 打开朋友的链接，收下「TA 去过你没去过的 N 个地方」，地图上以虚线标出待点亮，全部点亮即完成。不用服务器，也不用加好友
- 🌍 **全世界都能刷** — 中国用官方行政区划（DataV），其他国家先查打包好的离线静态 OSM 边界（`public/osm-boundaries.json`，覆盖 90+ 高频城市），缺失时再回退到 Nominatim，全部自动简化后存本机
- 🤖 **AI 原生输入** — 右下角输入「成都，去年春天」或「Amsterdam」即可自动解析城市、日期、出行类型
- 📝 **笔记 & 照片** — 每个地点都可以写笔记、上传照片 — 全部存于本机 IndexedDB
- 🔒 **完全私人** — 零账号、零注册、零云端。打开网页即用
- 📦 **数据可携带** — 一键导出 JSON 备份，换设备 / 换浏览器无缝迁移
- 🌐 **开源 (MIT)** — 你可以审计、修改、自部署

## 🖌️ 区域刷亮怎么用

**中国视图** —— 每个行政区域都是可以「刷」的色块：

| 操作 | 效果 |
| --- | --- |
| **单击**区域 | 点亮它 —— 整个市/县的轮廓被填充，像涂鸦一样 |
| **单击**已点亮的区域 | 打开右侧详情，补充日期、笔记、照片，或删除（取消点亮） |
| **双击**区域 | 下钻一级（全国 → 省 → 市 → 区县） |
| **点击面包屑** | 回到任意上级 |

区域填充有三种状态，一眼区分「去过」和「只是下面有去过的地方」：

- **实心亮色** — 你直接记录了这个区域
- **中等亮度** — 这个区域下面有点亮的子区域（比如省内点亮了某个市）
- **淡虚线填充** — 你点亮了它的上级、但没细分到这里（比如点亮了整个市，里面的区县）

**世界视图** —— 用右下角输入框写下去过的城市（如 `Amsterdam`、`Kyoto`），后台先在打包好的离线 OSM 边界（`public/osm-boundaries.json`，含 Tokyo / Sydney / Paris / Moscow 等 90+ 高频城市）中查，命中就直接画上。命中不到的城市走 Nominatim，按 1 req/秒限速，第一次会看到「正在获取 N 个城市的边界…」，之后缓存到 IndexedDB，不再联网。

每座城市在世界视图上是一个**带名字的彩色圆点**（去过两次以上会显示 `×2`），不是一个没有说明的孤点。城市名字一直可见；名字太密挤在一起时会自动隐藏一部分，放大后重新出现。

**单击城市**，地图会飞过去并把这座城市的**真实行政边界**框满屏幕 —— 所以你看到的是它的**范围**，不是代表它的那个点。因为城市的轮廓在全球缩放下本来就不足一个像素（成都约占 87×70 像素、北京更小），只有飞进去才看得清真正的形状。

两个细节：

- 边界里如果混着飞地（东京都包含往南 1000 公里的岛屿），取景只会框住**离城市最近的那块多边形**，不会缩到一片空海。
- 万一某座城市在 OSM 上取不到多边形，会退化成它的上级行政区轮廓或外接圆，并用**虚线**画出来，表示这是个近似范围；再不行才只留一个点，不会丢数据。

**成就**

13 个徽章由你已有的数据算出来，不需要额外记录：第一步、十城、五十城、省级探索者、四大直辖市、沿海走廊、五大自治区、国土 10%、半壁江山、走遍全国、第一次出国、三大洲、跨越赤道。在设置页可以看到整面徽章墙和进度。

**分享与「每个人自己的数据」**

部署成静态站之后，每个访问者本来就有各自独立的数据 —— localStorage 和 IndexedDB 是按浏览器隔离的，不需要账号。

想在朋友面前炫一下时，用**设置 → 分享 → 复制链接**生成一条只读链接：

- 数据全部压在 URL 片段里（最多 600 个地点也只要约 1500 字符），不经过任何服务器
- 对方打开看到你的点亮版图 + 统计；如果 TA 自己也有地图，会显示**重合度**
- **笔记、照片、具体日期和坐标都不会进链接**，只分享「去过哪」
- 中国的分享内容**默认只到市级**，区县会被自动上卷——「在一个城市只点亮两个区」约等于公布住址
- 链接一旦发出就收不回，分享前请确认

**挑战怎么玩**

1. 朋友把他的分享链接发给你，你打开它
2. 如果你自己也有地图，页面会显示**重合度**和「TA 去过、你没去过的 N 个地方」
3. 点「收下挑战」——这些地方会以**流动的虚线轮廓**画在你的中国地图上，右上角显示 `好友的挑战 3/12`
4. 点亮它们（单击区域即可），进度实时增长；全部点亮后提示你生成自己的链接发回去

挑战在你的浏览器里算出来（对方快照 − 你的地图），**完成状态不会自动回传**——没有任何自动上报，这是刻意的：否则别人能靠一条只含一个区的链接来探测你去没去过某地。

**数据来源**

- 中国行政区划：[DataV.GeoAtlas](https://datav.aliyun.com/portal/school/atlas/area_selector)，按需加载并缓存在本机
- 国外城市边界：OpenStreetMap via [Nominatim](https://nominatim.openstreetmap.org/)（ODbL），Douglas–Peucker 简化到每城 ≤1600 点（7 座城市共约 34KB）
- 全球城市库：[GeoNames](https://www.geonames.org/)（CC-BY 4.0）



## 🖼 截图

> 首页 / 世界地图 / 中国视图 / 添加地点 / 详情面板

## 🚀 快速开始

```bash
# 克隆
git clone https://github.com/yourname/traveltally.git
cd traveltally

# 安装依赖（推荐 pnpm 或 npm）
npm install

# 开发模式
npm run dev
# 打开 http://localhost:5173

# 生产构建
npm run build
npm run preview
```

零环境变量，零后端，零数据库。开箱即用。

## 🛠 技术栈

| 类别 | 选型 |
| --- | --- |
| 构建 | Vite 7 + TypeScript 5 |
| 框架 | React 19 |
| 样式 | Tailwind CSS 4 + 手写 design tokens |
| 地图 | React Leaflet 5 (OpenStreetMap 瓦片) |
| 状态 | Zustand + persist middleware |
| 动效 | Framer Motion |
| UI 原子 | Radix UI (Dialog / Popover) |
| 照片存储 | IndexedDB (via `idb`) |
| 图标 | lucide-react |

## 🏗 项目结构

```
src/
├── components/      # 复用 UI
│   ├── map/         # 地图视图 + 添加地点弹窗
│   ├── china/       # 中国地图（含 GeoJSON 渲染）
│   ├── sidebar/     # 详情面板、列表、统计
│   └── ui/          # Button, Dialog, Input, ...
├── data/
│   ├── china.ts     # 中国省市数据
│   └── cities.ts    # 默认热门城市列表（用于即时搜索）
├── hooks/
│   ├── useCitySearch.ts    # 按前缀分片加载城市索引
│   └── useStore.ts         # Zustand 全局状态
├── lib/
│   ├── photoStore.ts       # IndexedDB 照片 CRUD
│   ├── colors.ts           # 颜色映射
│   └── utils.ts
├── pages/
│   ├── HomePage.tsx        # 首页
│   ├── WorldPage.tsx       # 世界地图页
│   ├── ChinaPage.tsx       # 中国地图页
│   └── SettingsPage.tsx    # 设置 / 导入导出
└── types.ts

public/
├── cities/                 # 706 个 JSON 文件，按前缀索引全球城市
└── china-provinces.json    # 中国省级 GeoJSON（DataV.GeoAtlas）
```

## 🔐 隐私

- 所有地点、笔记存于浏览器 `localStorage`
- 照片存于浏览器 `IndexedDB`
- 没有任何后端、没有任何上传（除地图瓦片由 OpenStreetMap 提供）

清空浏览器数据 = 完全删除你的所有记录。建议定期使用「导出 JSON」备份。

### 🛠️ 更新离线边界包

`public/osm-boundaries.json` 是打包好的离线 OSM 边界，首次安装默认覆盖 90+ 高频城市。要扩展覆盖或重新打包：

```bash
node scripts/build-osm-boundaries.mjs           # 全量打包（~2 分钟，Nominatim 1 req/s）
node scripts/retry-osm-boundaries.mjs /tmp/missing.json   # 补漏
```

城市列表在 `scripts/build-osm-boundaries.mjs` 顶部的 `CITIES` 数组里。生成的 `osm-boundaries.json` 直接被 `lookupBoundary` 在 Nominatim 之前优先命中。

## 📦 致谢 / 数据来源

- 全球城市数据：[GeoNames](https://www.geonames.org/) — CC-BY 4.0
- 国外城市边界：[OpenStreetMap](https://www.openstreetmap.org/) via [Nominatim](https://nominatim.openstreetmap.org/) — ODbL，Douglas–Peucker 简化到每城 ≤1600 点（`public/osm-boundaries.json` ~385 KB 覆盖 90+ 城）
- 中国省级 GeoJSON：[DataV.GeoAtlas](https://datav.aliyun.com/portal/school/atlas/area_selector) — 公开数据
- 地图瓦片：[OpenStreetMap](https://www.openstreetmap.org/) contributors — ODbL

## 📄 License

MIT © TravelTally Contributors
