import type { ChinaProvince } from "@/types";

/**
 * 34 省级行政区，含中心坐标与合适的缩放级别。
 * 数据来源：公开行政区划数据（GeoNames / 国家统计局），坐标为各省级行政中心常用值。
 */
export const CHINA_PROVINCES: ChinaProvince[] = [
  { code: "110000", name: "北京市", center: [39.9042, 116.4074], zoom: 9 , area: 16410 },
  { code: "120000", name: "天津市", center: [39.0851, 117.1994], zoom: 9 , area: 11966 },
  { code: "130000", name: "河北省", center: [38.0371, 114.5149], zoom: 6 , area: 188800 },
  { code: "140000", name: "山西省", center: [37.8734, 112.9633], zoom: 6 , area: 156700 },
  { code: "150000", name: "内蒙古自治区", center: [40.8414, 111.7519], zoom: 5 , area: 1183000 },
  { code: "210000", name: "辽宁省", center: [41.8057, 123.4315], zoom: 6 , area: 148000 },
  { code: "220000", name: "吉林省", center: [43.8868, 125.3245], zoom: 6 , area: 187400 },
  { code: "230000", name: "黑龙江省", center: [45.8038, 126.5350], zoom: 5 , area: 473000 },
  { code: "310000", name: "上海市", center: [31.2304, 121.4737], zoom: 9 , area: 6341 },
  { code: "320000", name: "江苏省", center: [32.0603, 118.7969], zoom: 6 , area: 107200 },
  { code: "330000", name: "浙江省", center: [29.1417, 120.0740], zoom: 6 , area: 105500 },
  { code: "340000", name: "安徽省", center: [31.8206, 117.2272], zoom: 6 , area: 140100 },
  { code: "350000", name: "福建省", center: [26.0745, 119.2965], zoom: 6 , area: 124000 },
  { code: "360000", name: "江西省", center: [28.6760, 115.8921], zoom: 6 , area: 166900 },
  { code: "370000", name: "山东省", center: [36.6512, 117.1201], zoom: 6 , area: 157900 },
  { code: "410000", name: "河南省", center: [34.7466, 113.6253], zoom: 6 , area: 167000 },
  { code: "420000", name: "湖北省", center: [30.5928, 114.3055], zoom: 6 , area: 185900 },
  { code: "430000", name: "湖南省", center: [27.6100, 111.7088], zoom: 6 , area: 211800 },
  { code: "440000", name: "广东省", center: [23.3791, 113.7633], zoom: 6 , area: 179700 },
  { code: "450000", name: "广西壮族自治区", center: [23.8298, 108.7881], zoom: 6 , area: 237600 },
  { code: "460000", name: "海南省", center: [19.5667, 109.9497], zoom: 7 , area: 35400 },
  { code: "500000", name: "重庆市", center: [29.5630, 106.5516], zoom: 7 , area: 82400 },
  { code: "510000", name: "四川省", center: [30.6171, 102.7103], zoom: 5 , area: 486000 },
  { code: "520000", name: "贵州省", center: [26.5974, 106.7074], zoom: 6 , area: 176000 },
  { code: "530000", name: "云南省", center: [24.8801, 102.8329], zoom: 5 , area: 394000 },
  { code: "540000", name: "西藏自治区", center: [29.6500, 91.1700], zoom: 5 , area: 1228400 },
  { code: "610000", name: "陕西省", center: [34.2632, 108.9480], zoom: 6 , area: 205600 },
  { code: "620000", name: "甘肃省", center: [36.0611, 103.8343], zoom: 5 , area: 425800 },
  { code: "630000", name: "青海省", center: [36.6232, 101.7804], zoom: 5 , area: 722300 },
  { code: "640000", name: "宁夏回族自治区", center: [38.4872, 106.2309], zoom: 6 , area: 66400 },
  { code: "650000", name: "新疆维吾尔自治区", center: [43.7930, 87.6300], zoom: 5 , area: 1660000 },
  { code: "710000", name: "台湾省", center: [23.6978, 120.9605], zoom: 7 , area: 36000 },
  { code: "810000", name: "香港特别行政区", center: [22.3193, 114.1694], zoom: 10 , area: 1100 },
  { code: "820000", name: "澳门特别行政区", center: [22.1987, 113.5439], zoom: 12 , area: 33 },
];

/**
 * 常见中国城市及其所在的省份代码 (用于"国内模式"快速分类)。
 * 完整列表包含 300+ 个地级市，这里给出一份精选 + 行政区划 4 位代码模式。
 * 数据来源：国家行政区划公开数据。
 */
export const CHINA_CITIES: { name: string; provinceCode: string; lat: number; lng: number; code: string }[] = [
  // 北京
  { name: "北京市", provinceCode: "110000", code: "110100", lat: 39.9042, lng: 116.4074 },
  // 天津
  { name: "天津市", provinceCode: "120000", code: "120100", lat: 39.0851, lng: 117.1994 },
  // 上海
  { name: "上海市", provinceCode: "310000", code: "310100", lat: 31.2304, lng: 121.4737 },
  // 重庆
  { name: "重庆市", provinceCode: "500000", code: "500100", lat: 29.5630, lng: 106.5516 },

  // 河北
  { name: "石家庄市", provinceCode: "130000", code: "130100", lat: 38.0428, lng: 114.5149 },
  { name: "唐山市", provinceCode: "130000", code: "130200", lat: 39.6308, lng: 118.1804 },
  { name: "秦皇岛市", provinceCode: "130000", code: "130300", lat: 39.9354, lng: 119.6005 },
  { name: "邯郸市", provinceCode: "130000", code: "130400", lat: 36.6253, lng: 114.5391 },
  { name: "邢台市", provinceCode: "130000", code: "130500", lat: 37.0707, lng: 114.5048 },
  { name: "保定市", provinceCode: "130000", code: "130600", lat: 38.8671, lng: 115.4845 },
  { name: "张家口市", provinceCode: "130000", code: "130700", lat: 40.8245, lng: 114.8794 },
  { name: "承德市", provinceCode: "130000", code: "130800", lat: 40.9521, lng: 117.9634 },
  { name: "沧州市", provinceCode: "130000", code: "130900", lat: 38.3104, lng: 116.8388 },
  { name: "廊坊市", provinceCode: "130000", code: "131000", lat: 39.5379, lng: 116.6836 },
  { name: "衡水市", provinceCode: "130000", code: "131100", lat: 37.7385, lng: 115.6705 },

  // 山西
  { name: "太原市", provinceCode: "140000", code: "140100", lat: 37.8706, lng: 112.5489 },
  { name: "大同市", provinceCode: "140000", code: "140200", lat: 40.0764, lng: 113.3001 },
  { name: "阳泉市", provinceCode: "140000", code: "140300", lat: 37.8576, lng: 113.5763 },
  { name: "长治市", provinceCode: "140000", code: "140400", lat: 36.1955, lng: 113.1163 },
  { name: "晋城市", provinceCode: "140000", code: "140500", lat: 35.4906, lng: 112.8513 },
  { name: "朔州市", provinceCode: "140000", code: "140600", lat: 39.3315, lng: 112.4329 },
  { name: "晋中市", provinceCode: "140000", code: "140700", lat: 37.6878, lng: 112.7528 },
  { name: "运城市", provinceCode: "140000", code: "140800", lat: 35.0269, lng: 111.0030 },
  { name: "忻州市", provinceCode: "140000", code: "140900", lat: 38.4167, lng: 112.7341 },
  { name: "临汾市", provinceCode: "140000", code: "141000", lat: 36.0880, lng: 111.5180 },
  { name: "吕梁市", provinceCode: "140000", code: "141100", lat: 37.5184, lng: 111.1442 },

  // 内蒙古
  { name: "呼和浩特市", provinceCode: "150000", code: "150100", lat: 40.8426, lng: 111.7491 },
  { name: "包头市", provinceCode: "150000", code: "150200", lat: 40.6574, lng: 109.8403 },
  { name: "乌海市", provinceCode: "150000", code: "150300", lat: 39.6551, lng: 106.7948 },
  { name: "赤峰市", provinceCode: "150000", code: "150400", lat: 42.2586, lng: 118.8889 },
  { name: "通辽市", provinceCode: "150000", code: "150500", lat: 43.6173, lng: 122.2657 },
  { name: "鄂尔多斯市", provinceCode: "150000", code: "150600", lat: 39.6086, lng: 109.7813 },
  { name: "呼伦贝尔市", provinceCode: "150000", code: "150700", lat: 49.2120, lng: 119.7585 },
  { name: "巴彦淖尔市", provinceCode: "150000", code: "150800", lat: 40.7574, lng: 107.4163 },
  { name: "乌兰察布市", provinceCode: "150000", code: "150900", lat: 41.0341, lng: 113.1145 },

  // 辽宁
  { name: "沈阳市", provinceCode: "210000", code: "210100", lat: 41.8057, lng: 123.4315 },
  { name: "大连市", provinceCode: "210000", code: "210200", lat: 38.9140, lng: 121.6147 },
  { name: "鞍山市", provinceCode: "210000", code: "210300", lat: 41.1085, lng: 122.9946 },
  { name: "抚顺市", provinceCode: "210000", code: "210400", lat: 41.8806, lng: 123.9572 },
  { name: "本溪市", provinceCode: "210000", code: "210500", lat: 41.2864, lng: 123.7651 },
  { name: "丹东市", provinceCode: "210000", code: "210600", lat: 40.1294, lng: 124.3543 },
  { name: "锦州市", provinceCode: "210000", code: "210700", lat: 41.0950, lng: 121.1268 },
  { name: "营口市", provinceCode: "210000", code: "210800", lat: 40.6675, lng: 122.2350 },
  { name: "阜新市", provinceCode: "210000", code: "210900", lat: 42.0119, lng: 121.6588 },
  { name: "辽阳市", provinceCode: "210000", code: "211000", lat: 41.2693, lng: 123.1721 },
  { name: "盘锦市", provinceCode: "210000", code: "211100", lat: 41.1245, lng: 122.0707 },
  { name: "铁岭市", provinceCode: "210000", code: "211200", lat: 42.2236, lng: 123.7257 },
  { name: "朝阳市", provinceCode: "210000", code: "211300", lat: 41.5765, lng: 120.4509 },
  { name: "葫芦岛市", provinceCode: "210000", code: "211400", lat: 40.7556, lng: 120.8378 },

  // 吉林
  { name: "长春市", provinceCode: "220000", code: "220100", lat: 43.8868, lng: 125.3245 },
  { name: "吉林市", provinceCode: "220000", code: "220200", lat: 43.8378, lng: 126.5494 },
  { name: "四平市", provinceCode: "220000", code: "220300", lat: 43.1666, lng: 124.3500 },
  { name: "辽源市", provinceCode: "220000", code: "220400", lat: 42.8881, lng: 125.1450 },
  { name: "通化市", provinceCode: "220000", code: "220500", lat: 41.7212, lng: 125.9395 },
  { name: "白山市", provinceCode: "220000", code: "220600", lat: 41.9407, lng: 126.4239 },
  { name: "松原市", provinceCode: "220000", code: "220700", lat: 45.1183, lng: 124.8252 },
  { name: "白城市", provinceCode: "220000", code: "220800", lat: 45.6196, lng: 122.8389 },
  { name: "延边朝鲜族自治州", provinceCode: "220000", code: "222400", lat: 42.9046, lng: 129.5091 },

  // 黑龙江
  { name: "哈尔滨市", provinceCode: "230000", code: "230100", lat: 45.8038, lng: 126.5350 },
  { name: "齐齐哈尔市", provinceCode: "230000", code: "230200", lat: 47.3543, lng: 123.9180 },
  { name: "鸡西市", provinceCode: "230000", code: "230300", lat: 45.2950, lng: 130.9690 },
  { name: "鹤岗市", provinceCode: "230000", code: "230400", lat: 47.3322, lng: 130.2773 },
  { name: "双鸭山市", provinceCode: "230000", code: "230500", lat: 46.6463, lng: 131.1591 },
  { name: "大庆市", provinceCode: "230000", code: "230600", lat: 46.5897, lng: 125.1038 },
  { name: "伊春市", provinceCode: "230000", code: "230700", lat: 47.7280, lng: 128.8413 },
  { name: "佳木斯市", provinceCode: "230000", code: "230800", lat: 46.7997, lng: 130.3186 },
  { name: "七台河市", provinceCode: "230000", code: "230900", lat: 45.7710, lng: 131.0033 },
  { name: "牡丹江市", provinceCode: "230000", code: "231000", lat: 44.5826, lng: 129.6086 },
  { name: "黑河市", provinceCode: "230000", code: "231100", lat: 50.2451, lng: 127.5285 },
  { name: "绥化市", provinceCode: "230000", code: "231200", lat: 46.6534, lng: 126.9695 },

  // 江苏
  { name: "南京市", provinceCode: "320000", code: "320100", lat: 32.0603, lng: 118.7969 },
  { name: "无锡市", provinceCode: "320000", code: "320200", lat: 31.4912, lng: 120.3119 },
  { name: "徐州市", provinceCode: "320000", code: "320300", lat: 34.2616, lng: 117.1860 },
  { name: "常州市", provinceCode: "320000", code: "320400", lat: 31.7728, lng: 119.9469 },
  { name: "苏州市", provinceCode: "320000", code: "320500", lat: 31.2989, lng: 120.5853 },
  { name: "南通市", provinceCode: "320000", code: "320600", lat: 31.9803, lng: 120.8943 },
  { name: "连云港市", provinceCode: "320000", code: "320700", lat: 34.5970, lng: 119.2216 },
  { name: "淮安市", provinceCode: "320000", code: "320800", lat: 33.6100, lng: 119.0149 },
  { name: "盐城市", provinceCode: "320000", code: "320900", lat: 33.3500, lng: 120.1633 },
  { name: "扬州市", provinceCode: "320000", code: "321000", lat: 32.3947, lng: 119.4129 },
  { name: "镇江市", provinceCode: "320000", code: "321100", lat: 32.1885, lng: 119.4250 },
  { name: "泰州市", provinceCode: "320000", code: "321200", lat: 32.4554, lng: 119.9240 },
  { name: "宿迁市", provinceCode: "320000", code: "321300", lat: 33.9630, lng: 118.2752 },

  // 浙江
  { name: "杭州市", provinceCode: "330000", code: "330100", lat: 30.2741, lng: 120.1551 },
  { name: "宁波市", provinceCode: "330000", code: "330200", lat: 29.8683, lng: 121.5440 },
  { name: "温州市", provinceCode: "330000", code: "330300", lat: 27.9938, lng: 120.6993 },
  { name: "嘉兴市", provinceCode: "330000", code: "330400", lat: 30.7522, lng: 120.7506 },
  { name: "湖州市", provinceCode: "330000", code: "330500", lat: 30.8932, lng: 120.0875 },
  { name: "绍兴市", provinceCode: "330000", code: "330600", lat: 30.0298, lng: 120.5832 },
  { name: "金华市", provinceCode: "330000", code: "330700", lat: 29.0784, lng: 119.6473 },
  { name: "衢州市", provinceCode: "330000", code: "330800", lat: 28.9359, lng: 118.8593 },
  { name: "舟山市", provinceCode: "330000", code: "330900", lat: 29.9853, lng: 122.2072 },
  { name: "台州市", provinceCode: "330000", code: "331000", lat: 28.6560, lng: 121.4208 },
  { name: "丽水市", provinceCode: "330000", code: "331100", lat: 28.4517, lng: 119.9229 },

  // 安徽
  { name: "合肥市", provinceCode: "340000", code: "340100", lat: 31.8206, lng: 117.2272 },
  { name: "芜湖市", provinceCode: "340000", code: "340200", lat: 31.3526, lng: 118.4325 },
  { name: "蚌埠市", provinceCode: "340000", code: "340300", lat: 32.9163, lng: 117.3890 },
  { name: "淮南市", provinceCode: "340000", code: "340400", lat: 32.6469, lng: 117.0184 },
  { name: "马鞍山市", provinceCode: "340000", code: "340500", lat: 31.6700, lng: 118.5060 },
  { name: "淮北市", provinceCode: "340000", code: "340600", lat: 33.9716, lng: 116.7986 },
  { name: "铜陵市", provinceCode: "340000", code: "340700", lat: 30.9296, lng: 117.8169 },
  { name: "安庆市", provinceCode: "340000", code: "340800", lat: 30.5430, lng: 117.0635 },
  { name: "黄山市", provinceCode: "340000", code: "341000", lat: 29.7148, lng: 118.3376 },
  { name: "滁州市", provinceCode: "340000", code: "341100", lat: 32.3018, lng: 118.3168 },
  { name: "阜阳市", provinceCode: "340000", code: "341200", lat: 32.8901, lng: 115.8146 },
  { name: "宿州市", provinceCode: "340000", code: "341300", lat: 33.6466, lng: 116.9839 },
  { name: "六安市", provinceCode: "340000", code: "341500", lat: 31.7335, lng: 116.5076 },
  { name: "亳州市", provinceCode: "340000", code: "341600", lat: 33.8693, lng: 115.7787 },
  { name: "池州市", provinceCode: "340000", code: "341700", lat: 30.6646, lng: 117.4915 },
  { name: "宣城市", provinceCode: "340000", code: "341800", lat: 30.9456, lng: 118.7587 },

  // 福建
  { name: "福州市", provinceCode: "350000", code: "350100", lat: 26.0745, lng: 119.2965 },
  { name: "厦门市", provinceCode: "350000", code: "350200", lat: 24.4798, lng: 118.0894 },
  { name: "莆田市", provinceCode: "350000", code: "350300", lat: 25.4310, lng: 119.0078 },
  { name: "三明市", provinceCode: "350000", code: "350400", lat: 26.2655, lng: 117.6390 },
  { name: "泉州市", provinceCode: "350000", code: "350500", lat: 24.8741, lng: 118.6757 },
  { name: "漳州市", provinceCode: "350000", code: "350600", lat: 24.5130, lng: 117.6471 },
  { name: "南平市", provinceCode: "350000", code: "350700", lat: 26.6418, lng: 118.1780 },
  { name: "龙岩市", provinceCode: "350000", code: "350800", lat: 25.0915, lng: 117.0297 },
  { name: "宁德市", provinceCode: "350000", code: "350900", lat: 26.6656, lng: 119.5275 },

  // 江西
  { name: "南昌市", provinceCode: "360000", code: "360100", lat: 28.6760, lng: 115.8921 },
  { name: "景德镇市", provinceCode: "360000", code: "360200", lat: 29.2682, lng: 117.1784 },
  { name: "萍乡市", provinceCode: "360000", code: "360300", lat: 27.6229, lng: 113.8542 },
  { name: "九江市", provinceCode: "360000", code: "360400", lat: 29.7050, lng: 116.0010 },
  { name: "新余市", provinceCode: "360000", code: "360500", lat: 27.8174, lng: 114.9170 },
  { name: "鹰潭市", provinceCode: "360000", code: "360600", lat: 28.2607, lng: 117.0686 },
  { name: "赣州市", provinceCode: "360000", code: "360700", lat: 25.8311, lng: 114.9335 },
  { name: "吉安市", provinceCode: "360000", code: "360800", lat: 27.1140, lng: 114.9866 },
  { name: "宜春市", provinceCode: "360000", code: "360900", lat: 27.8146, lng: 114.4163 },
  { name: "抚州市", provinceCode: "360000", code: "361000", lat: 27.9485, lng: 116.3582 },
  { name: "上饶市", provinceCode: "360000", code: "361100", lat: 28.4549, lng: 117.9433 },

  // 山东
  { name: "济南市", provinceCode: "370000", code: "370100", lat: 36.6512, lng: 117.1201 },
  { name: "青岛市", provinceCode: "370000", code: "370200", lat: 36.0671, lng: 120.3826 },
  { name: "淄博市", provinceCode: "370000", code: "370300", lat: 36.8131, lng: 118.0548 },
  { name: "枣庄市", provinceCode: "370000", code: "370400", lat: 34.8108, lng: 117.3239 },
  { name: "东营市", provinceCode: "370000", code: "370500", lat: 37.4335, lng: 118.6747 },
  { name: "烟台市", provinceCode: "370000", code: "370600", lat: 37.4638, lng: 121.4480 },
  { name: "潍坊市", provinceCode: "370000", code: "370700", lat: 36.7068, lng: 119.1619 },
  { name: "济宁市", provinceCode: "370000", code: "370800", lat: 35.4154, lng: 116.5871 },
  { name: "泰安市", provinceCode: "370000", code: "370900", lat: 36.1939, lng: 117.1289 },
  { name: "威海市", provinceCode: "370000", code: "371000", lat: 37.5128, lng: 122.1201 },
  { name: "日照市", provinceCode: "370000", code: "371100", lat: 35.4164, lng: 119.5269 },
  { name: "临沂市", provinceCode: "370000", code: "371300", lat: 35.1042, lng: 118.3564 },
  { name: "德州市", provinceCode: "370000", code: "371400", lat: 37.4355, lng: 116.3593 },
  { name: "聊城市", provinceCode: "370000", code: "371500", lat: 36.4566, lng: 115.9856 },
  { name: "滨州市", provinceCode: "370000", code: "371600", lat: 37.3835, lng: 117.9706 },
  { name: "菏泽市", provinceCode: "370000", code: "371700", lat: 35.2333, lng: 115.4810 },

  // 河南
  { name: "郑州市", provinceCode: "410000", code: "410100", lat: 34.7466, lng: 113.6253 },
  { name: "开封市", provinceCode: "410000", code: "410200", lat: 34.7972, lng: 114.3076 },
  { name: "洛阳市", provinceCode: "410000", code: "410300", lat: 34.6197, lng: 112.4540 },
  { name: "平顶山市", provinceCode: "410000", code: "410400", lat: 33.7660, lng: 113.1923 },
  { name: "安阳市", provinceCode: "410000", code: "410500", lat: 36.0986, lng: 114.3925 },
  { name: "鹤壁市", provinceCode: "410000", code: "410600", lat: 35.7475, lng: 114.2974 },
  { name: "新乡市", provinceCode: "410000", code: "410700", lat: 35.3030, lng: 113.9268 },
  { name: "焦作市", provinceCode: "410000", code: "410800", lat: 35.2159, lng: 113.2418 },
  { name: "濮阳市", provinceCode: "410000", code: "410900", lat: 35.7682, lng: 115.0290 },
  { name: "许昌市", provinceCode: "410000", code: "411000", lat: 34.0357, lng: 113.8262 },
  { name: "漯河市", provinceCode: "410000", code: "411100", lat: 33.5759, lng: 114.0167 },
  { name: "三门峡市", provinceCode: "410000", code: "411200", lat: 34.7726, lng: 111.2003 },
  { name: "南阳市", provinceCode: "410000", code: "411300", lat: 32.9908, lng: 112.5288 },
  { name: "商丘市", provinceCode: "410000", code: "411400", lat: 34.4146, lng: 115.6504 },
  { name: "信阳市", provinceCode: "410000", code: "411500", lat: 32.1473, lng: 114.0913 },
  { name: "周口市", provinceCode: "410000", code: "411600", lat: 33.6204, lng: 114.6497 },
  { name: "驻马店市", provinceCode: "410000", code: "411700", lat: 32.9802, lng: 114.0249 },

  // 湖北
  { name: "武汉市", provinceCode: "420000", code: "420100", lat: 30.5928, lng: 114.3055 },
  { name: "黄石市", provinceCode: "420000", code: "420200", lat: 30.1985, lng: 115.0772 },
  { name: "十堰市", provinceCode: "420000", code: "420300", lat: 32.6298, lng: 110.7980 },
  { name: "宜昌市", provinceCode: "420000", code: "420500", lat: 30.6919, lng: 111.2864 },
  { name: "襄阳市", provinceCode: "420000", code: "420600", lat: 32.0094, lng: 112.1226 },
  { name: "鄂州市", provinceCode: "420000", code: "420700", lat: 30.3965, lng: 114.8949 },
  { name: "荆门市", provinceCode: "420000", code: "420800", lat: 31.0354, lng: 112.2049 },
  { name: "孝感市", provinceCode: "420000", code: "420900", lat: 30.9264, lng: 113.9165 },
  { name: "荆州市", provinceCode: "420000", code: "421000", lat: 30.3346, lng: 112.2410 },
  { name: "黄冈市", provinceCode: "420000", code: "421100", lat: 30.4533, lng: 114.8721 },
  { name: "咸宁市", provinceCode: "420000", code: "421200", lat: 29.8410, lng: 114.3221 },
  { name: "随州市", provinceCode: "420000", code: "421300", lat: 31.6900, lng: 113.3833 },
  { name: "恩施土家族苗族自治州", provinceCode: "420000", code: "422800", lat: 30.2944, lng: 109.4884 },

  // 湖南
  { name: "长沙市", provinceCode: "430000", code: "430100", lat: 28.2282, lng: 112.9388 },
  { name: "株洲市", provinceCode: "430000", code: "430200", lat: 27.8358, lng: 113.1313 },
  { name: "湘潭市", provinceCode: "430000", code: "430300", lat: 27.8298, lng: 112.9438 },
  { name: "衡阳市", provinceCode: "430000", code: "430400", lat: 26.8943, lng: 112.5722 },
  { name: "邵阳市", provinceCode: "430000", code: "430500", lat: 27.2389, lng: 111.4677 },
  { name: "岳阳市", provinceCode: "430000", code: "430600", lat: 29.3572, lng: 113.1289 },
  { name: "常德市", provinceCode: "430000", code: "430700", lat: 29.0317, lng: 111.6991 },
  { name: "张家界市", provinceCode: "430000", code: "430800", lat: 29.1170, lng: 110.4791 },
  { name: "益阳市", provinceCode: "430000", code: "430900", lat: 28.5538, lng: 112.3551 },
  { name: "郴州市", provinceCode: "430000", code: "431000", lat: 25.7707, lng: 113.0148 },
  { name: "永州市", provinceCode: "430000", code: "431100", lat: 26.4203, lng: 111.6132 },
  { name: "怀化市", provinceCode: "430000", code: "431200", lat: 27.5575, lng: 109.9785 },
  { name: "娄底市", provinceCode: "430000", code: "431300", lat: 27.7280, lng: 111.9968 },
  { name: "湘西土家族苗族自治州", provinceCode: "430000", code: "433100", lat: 28.3147, lng: 109.7388 },

  // 广东
  { name: "广州市", provinceCode: "440000", code: "440100", lat: 23.1291, lng: 113.2644 },
  { name: "韶关市", provinceCode: "440000", code: "440200", lat: 24.8108, lng: 113.5972 },
  { name: "深圳市", provinceCode: "440000", code: "440300", lat: 22.5431, lng: 114.0579 },
  { name: "珠海市", provinceCode: "440000", code: "440400", lat: 22.2710, lng: 113.5767 },
  { name: "汕头市", provinceCode: "440000", code: "440500", lat: 23.3535, lng: 116.6818 },
  { name: "佛山市", provinceCode: "440000", code: "440600", lat: 23.0218, lng: 113.1219 },
  { name: "江门市", provinceCode: "440000", code: "440700", lat: 22.5787, lng: 113.0817 },
  { name: "湛江市", provinceCode: "440000", code: "440800", lat: 21.2707, lng: 110.3594 },
  { name: "茂名市", provinceCode: "440000", code: "440900", lat: 21.6629, lng: 110.9255 },
  { name: "肇庆市", provinceCode: "440000", code: "441200", lat: 23.0470, lng: 112.4654 },
  { name: "惠州市", provinceCode: "440000", code: "441300", lat: 23.1115, lng: 114.4161 },
  { name: "梅州市", provinceCode: "440000", code: "441400", lat: 24.2886, lng: 116.1226 },
  { name: "汕尾市", provinceCode: "440000", code: "441500", lat: 22.7864, lng: 115.3754 },
  { name: "河源市", provinceCode: "440000", code: "441600", lat: 23.7434, lng: 114.6975 },
  { name: "阳江市", provinceCode: "440000", code: "441700", lat: 21.8579, lng: 111.9822 },
  { name: "清远市", provinceCode: "440000", code: "441800", lat: 23.6818, lng: 113.0563 },
  { name: "东莞市", provinceCode: "440000", code: "441900", lat: 23.0207, lng: 113.7518 },
  { name: "中山市", provinceCode: "440000", code: "442000", lat: 22.5159, lng: 113.3927 },
  { name: "潮州市", provinceCode: "440000", code: "445100", lat: 23.6618, lng: 116.6224 },
  { name: "揭阳市", provinceCode: "440000", code: "445200", lat: 23.5499, lng: 116.3728 },
  { name: "云浮市", provinceCode: "440000", code: "445300", lat: 22.9151, lng: 112.0445 },

  // 广西
  { name: "南宁市", provinceCode: "450000", code: "450100", lat: 22.8170, lng: 108.3669 },
  { name: "柳州市", provinceCode: "450000", code: "450200", lat: 24.3146, lng: 109.4280 },
  { name: "桂林市", provinceCode: "450000", code: "450300", lat: 25.2736, lng: 110.2907 },
  { name: "梧州市", provinceCode: "450000", code: "450400", lat: 23.4760, lng: 111.2790 },
  { name: "北海市", provinceCode: "450000", code: "450500", lat: 21.4733, lng: 109.1196 },
  { name: "防城港市", provinceCode: "450000", code: "450600", lat: 21.6862, lng: 108.3454 },
  { name: "钦州市", provinceCode: "450000", code: "450700", lat: 21.9799, lng: 108.6541 },
  { name: "贵港市", provinceCode: "450000", code: "450800", lat: 23.0939, lng: 109.5983 },
  { name: "玉林市", provinceCode: "450000", code: "450900", lat: 22.6543, lng: 110.1810 },
  { name: "百色市", provinceCode: "450000", code: "451000", lat: 23.9020, lng: 106.6184 },
  { name: "贺州市", provinceCode: "450000", code: "451100", lat: 24.4034, lng: 111.5519 },
  { name: "河池市", provinceCode: "450000", code: "451200", lat: 24.6929, lng: 108.0850 },
  { name: "来宾市", provinceCode: "450000", code: "451300", lat: 23.7507, lng: 109.2298 },
  { name: "崇左市", provinceCode: "450000", code: "451400", lat: 22.4040, lng: 107.3645 },

  // 海南
  { name: "海口市", provinceCode: "460000", code: "460100", lat: 20.0444, lng: 110.1989 },
  { name: "三亚市", provinceCode: "460000", code: "460200", lat: 18.2528, lng: 109.5119 },
  { name: "三沙市", provinceCode: "460000", code: "460300", lat: 16.8310, lng: 112.3346 },
  { name: "儋州市", provinceCode: "460000", code: "460400", lat: 19.5126, lng: 109.5765 },

  // 四川
  { name: "成都市", provinceCode: "510000", code: "510100", lat: 30.5728, lng: 104.0668 },
  { name: "自贡市", provinceCode: "510000", code: "510300", lat: 29.3392, lng: 104.7790 },
  { name: "攀枝花市", provinceCode: "510000", code: "510400", lat: 26.5824, lng: 101.7188 },
  { name: "泸州市", provinceCode: "510000", code: "510500", lat: 28.8717, lng: 105.4433 },
  { name: "德阳市", provinceCode: "510000", code: "510600", lat: 31.1268, lng: 104.3979 },
  { name: "绵阳市", provinceCode: "510000", code: "510700", lat: 31.4678, lng: 104.6796 },
  { name: "广元市", provinceCode: "510000", code: "510800", lat: 32.4358, lng: 105.8438 },
  { name: "遂宁市", provinceCode: "510000", code: "510900", lat: 30.5328, lng: 105.5713 },
  { name: "内江市", provinceCode: "510000", code: "511000", lat: 29.5870, lng: 105.0584 },
  { name: "乐山市", provinceCode: "510000", code: "511100", lat: 29.5521, lng: 103.7660 },
  { name: "南充市", provinceCode: "510000", code: "511300", lat: 30.8373, lng: 106.1105 },
  { name: "眉山市", provinceCode: "510000", code: "511400", lat: 30.0750, lng: 103.8484 },
  { name: "宜宾市", provinceCode: "510000", code: "511500", lat: 28.7513, lng: 104.6233 },
  { name: "广安市", provinceCode: "510000", code: "511600", lat: 30.4567, lng: 106.6333 },
  { name: "达州市", provinceCode: "510000", code: "511700", lat: 31.2098, lng: 107.4682 },
  { name: "雅安市", provinceCode: "510000", code: "511800", lat: 29.9805, lng: 103.0010 },
  { name: "巴中市", provinceCode: "510000", code: "511900", lat: 31.8581, lng: 106.7474 },
  { name: "资阳市", provinceCode: "510000", code: "512000", lat: 30.1222, lng: 104.6418 },
  { name: "阿坝藏族羌族自治州", provinceCode: "510000", code: "513200", lat: 31.8994, lng: 102.2244 },
  { name: "甘孜藏族自治州", provinceCode: "510000", code: "513300", lat: 30.0496, lng: 101.9636 },
  { name: "凉山彝族自治州", provinceCode: "510000", code: "513400", lat: 27.8865, lng: 102.2587 },

  // 贵州
  { name: "贵阳市", provinceCode: "520000", code: "520100", lat: 26.6470, lng: 106.6302 },
  { name: "六盘水市", provinceCode: "520000", code: "520200", lat: 26.5917, lng: 104.8329 },
  { name: "遵义市", provinceCode: "520000", code: "520300", lat: 27.7253, lng: 106.9272 },
  { name: "安顺市", provinceCode: "520000", code: "520400", lat: 26.2453, lng: 105.9322 },
  { name: "毕节市", provinceCode: "520000", code: "520500", lat: 27.2837, lng: 105.2862 },
  { name: "铜仁市", provinceCode: "520000", code: "520600", lat: 27.7180, lng: 109.1895 },
  { name: "黔西南布依族苗族自治州", provinceCode: "520000", code: "522300", lat: 25.0885, lng: 104.8978 },
  { name: "黔东南苗族侗族自治州", provinceCode: "520000", code: "522600", lat: 26.5836, lng: 107.9772 },
  { name: "黔南布依族苗族自治州", provinceCode: "520000", code: "522700", lat: 26.2587, lng: 107.5176 },

  // 云南
  { name: "昆明市", provinceCode: "530000", code: "530100", lat: 24.8801, lng: 102.8329 },
  { name: "曲靖市", provinceCode: "530000", code: "530300", lat: 25.4901, lng: 103.7960 },
  { name: "玉溪市", provinceCode: "530000", code: "530400", lat: 24.3517, lng: 102.5460 },
  { name: "保山市", provinceCode: "530000", code: "530500", lat: 25.1119, lng: 99.1611 },
  { name: "昭通市", provinceCode: "530000", code: "530600", lat: 27.3367, lng: 103.7173 },
  { name: "丽江市", provinceCode: "530000", code: "530700", lat: 26.8721, lng: 100.2330 },
  { name: "普洱市", provinceCode: "530000", code: "530800", lat: 22.8270, lng: 100.9722 },
  { name: "临沧市", provinceCode: "530000", code: "530900", lat: 23.8866, lng: 100.0793 },
  { name: "楚雄彝族自治州", provinceCode: "530000", code: "532300", lat: 25.0418, lng: 101.5460 },
  { name: "红河哈尼族彝族自治州", provinceCode: "530000", code: "532500", lat: 23.3640, lng: 103.3756 },
  { name: "文山壮族苗族自治州", provinceCode: "530000", code: "532600", lat: 23.3697, lng: 104.2440 },
  { name: "西双版纳傣族自治州", provinceCode: "530000", code: "532800", lat: 22.0017, lng: 100.7971 },
  { name: "大理白族自治州", provinceCode: "530000", code: "532900", lat: 25.6065, lng: 100.2679 },
  { name: "德宏傣族景颇族自治州", provinceCode: "530000", code: "533100", lat: 24.4366, lng: 98.5784 },
  { name: "怒江傈僳族自治州", provinceCode: "530000", code: "533300", lat: 25.8533, lng: 98.8540 },
  { name: "迪庆藏族自治州", provinceCode: "530000", code: "533400", lat: 27.8269, lng: 99.7065 },

  // 西藏
  { name: "拉萨市", provinceCode: "540000", code: "540100", lat: 29.6500, lng: 91.1700 },
  { name: "日喀则市", provinceCode: "540000", code: "540200", lat: 29.2675, lng: 88.8810 },
  { name: "昌都市", provinceCode: "540000", code: "540300", lat: 31.1369, lng: 97.1785 },
  { name: "林芝市", provinceCode: "540000", code: "540400", lat: 29.6543, lng: 94.3624 },
  { name: "山南市", provinceCode: "540000", code: "540500", lat: 29.2378, lng: 91.7666 },
  { name: "那曲市", provinceCode: "540000", code: "540600", lat: 31.4762, lng: 92.0517 },
  { name: "阿里地区", provinceCode: "540000", code: "542500", lat: 32.5036, lng: 80.1054 },

  // 陕西
  { name: "西安市", provinceCode: "610000", code: "610100", lat: 34.2632, lng: 108.9480 },
  { name: "铜川市", provinceCode: "610000", code: "610200", lat: 34.8967, lng: 108.9456 },
  { name: "宝鸡市", provinceCode: "610000", code: "610300", lat: 34.3613, lng: 107.2370 },
  { name: "咸阳市", provinceCode: "610000", code: "610400", lat: 34.3293, lng: 108.7050 },
  { name: "渭南市", provinceCode: "610000", code: "610500", lat: 34.4998, lng: 109.5103 },
  { name: "延安市", provinceCode: "610000", code: "610600", lat: 36.5854, lng: 109.4894 },
  { name: "汉中市", provinceCode: "610000", code: "610700", lat: 33.0680, lng: 107.0277 },
  { name: "榆林市", provinceCode: "610000", code: "610800", lat: 38.2853, lng: 109.7344 },
  { name: "安康市", provinceCode: "610000", code: "610900", lat: 32.6849, lng: 109.0294 },
  { name: "商洛市", provinceCode: "610000", code: "611000", lat: 33.8689, lng: 109.9408 },

  // 甘肃
  { name: "兰州市", provinceCode: "620000", code: "620100", lat: 36.0611, lng: 103.8343 },
  { name: "嘉峪关市", provinceCode: "620000", code: "620200", lat: 39.7714, lng: 98.2773 },
  { name: "金昌市", provinceCode: "620000", code: "620300", lat: 38.5202, lng: 102.1879 },
  { name: "白银市", provinceCode: "620000", code: "620400", lat: 36.5447, lng: 104.1382 },
  { name: "天水市", provinceCode: "620000", code: "620500", lat: 34.5805, lng: 105.7250 },
  { name: "武威市", provinceCode: "620000", code: "620600", lat: 37.9283, lng: 102.6411 },
  { name: "张掖市", provinceCode: "620000", code: "620700", lat: 38.9259, lng: 100.4498 },
  { name: "平凉市", provinceCode: "620000", code: "620800", lat: 35.5430, lng: 106.6650 },
  { name: "酒泉市", provinceCode: "620000", code: "620900", lat: 39.7325, lng: 98.4949 },
  { name: "庆阳市", provinceCode: "620000", code: "621000", lat: 35.7340, lng: 107.6440 },
  { name: "定西市", provinceCode: "620000", code: "621100", lat: 35.5810, lng: 104.6262 },
  { name: "陇南市", provinceCode: "620000", code: "621200", lat: 33.4006, lng: 104.9217 },
  { name: "临夏回族自治州", provinceCode: "620000", code: "622900", lat: 35.5995, lng: 103.2122 },
  { name: "甘南藏族自治州", provinceCode: "620000", code: "623000", lat: 34.9864, lng: 102.9111 },

  // 青海
  { name: "西宁市", provinceCode: "630000", code: "630100", lat: 36.6232, lng: 101.7804 },
  { name: "海东市", provinceCode: "630000", code: "630200", lat: 36.4798, lng: 102.1024 },
  { name: "海北藏族自治州", provinceCode: "630000", code: "632200", lat: 36.9595, lng: 100.9009 },
  { name: "黄南藏族自治州", provinceCode: "630000", code: "632300", lat: 35.5197, lng: 102.0193 },
  { name: "海南藏族自治州", provinceCode: "630000", code: "632500", lat: 36.2864, lng: 100.6201 },
  { name: "果洛藏族自治州", provinceCode: "630000", code: "632600", lat: 34.4736, lng: 100.2451 },
  { name: "玉树藏族自治州", provinceCode: "630000", code: "632700", lat: 33.0040, lng: 97.0064 },
  { name: "海西蒙古族藏族自治州", provinceCode: "630000", code: "632800", lat: 37.3744, lng: 97.3705 },

  // 宁夏
  { name: "银川市", provinceCode: "640000", code: "640100", lat: 38.4872, lng: 106.2309 },
  { name: "石嘴山市", provinceCode: "640000", code: "640200", lat: 38.9841, lng: 106.3835 },
  { name: "吴忠市", provinceCode: "640000", code: "640300", lat: 37.9863, lng: 106.1990 },
  { name: "固原市", provinceCode: "640000", code: "640400", lat: 36.0046, lng: 106.2425 },
  { name: "中卫市", provinceCode: "640000", code: "640500", lat: 37.5149, lng: 105.1896 },

  // 新疆
  { name: "乌鲁木齐市", provinceCode: "650000", code: "650100", lat: 43.7930, lng: 87.6300 },
  { name: "克拉玛依市", provinceCode: "650000", code: "650200", lat: 45.5800, lng: 84.8898 },
  { name: "吐鲁番市", provinceCode: "650000", code: "650400", lat: 42.9514, lng: 89.1893 },
  { name: "哈密市", provinceCode: "650000", code: "650500", lat: 42.8190, lng: 93.5151 },
  { name: "昌吉回族自治州", provinceCode: "650000", code: "652300", lat: 44.0144, lng: 87.3041 },
  { name: "博尔塔拉蒙古自治州", provinceCode: "650000", code: "652700", lat: 44.9032, lng: 82.0666 },
  { name: "巴音郭楞蒙古自治州", provinceCode: "650000", code: "652800", lat: 41.7641, lng: 86.1454 },
  { name: "阿克苏地区", provinceCode: "650000", code: "652900", lat: 41.1683, lng: 80.2606 },
  { name: "克孜勒苏柯尔克孜自治州", provinceCode: "650000", code: "653000", lat: 39.7150, lng: 76.1668 },
  { name: "喀什地区", provinceCode: "650000", code: "653100", lat: 39.4677, lng: 75.9938 },
  { name: "和田地区", provinceCode: "650000", code: "653200", lat: 37.1107, lng: 79.9217 },
  { name: "伊犁哈萨克自治州", provinceCode: "650000", code: "654000", lat: 43.9219, lng: 81.3179 },
  { name: "塔城地区", provinceCode: "650000", code: "654200", lat: 46.7461, lng: 82.9908 },
  { name: "阿勒泰地区", provinceCode: "650000", code: "654300", lat: 47.8484, lng: 88.1410 },

  // 台湾
  { name: "台北市", provinceCode: "710000", code: "710100", lat: 25.0330, lng: 121.5654 },
  { name: "高雄市", provinceCode: "710000", code: "710200", lat: 22.6273, lng: 120.3014 },
  { name: "台中市", provinceCode: "710000", code: "710300", lat: 24.1477, lng: 120.6736 },
  { name: "台南市", provinceCode: "710000", code: "710400", lat: 22.9999, lng: 120.2270 },
  { name: "新北市", provinceCode: "710000", code: "710500", lat: 25.0120, lng: 121.4658 },
  { name: "桃园市", provinceCode: "710000", code: "710600", lat: 24.9936, lng: 121.3010 },
  { name: "基隆市", provinceCode: "710000", code: "710700", lat: 25.1276, lng: 121.7392 },
  { name: "新竹市", provinceCode: "710000", code: "710800", lat: 24.8138, lng: 120.9675 },
  { name: "嘉义市", provinceCode: "710000", code: "710900", lat: 23.4801, lng: 120.4490 },

  // 香港
  { name: "香港", provinceCode: "810000", code: "810100", lat: 22.3193, lng: 114.1694 },

  // 澳门
  { name: "澳门", provinceCode: "820000", code: "820100", lat: 22.1987, lng: 113.5439 },
];

export function provinceByCode(code: string): ChinaProvince | undefined {
  return CHINA_PROVINCES.find((p) => p.code === code);
}

export function citiesByProvince(code: string) {
  return CHINA_CITIES.filter((c) => c.provinceCode === code);
}

/** Nearest CHINA_CITY's province for a coordinate inside China's bounding box. */
export function guessChinaRegion(lat: number, lng: number): { province: string; provinceCode: string } | undefined {
  if (lat < 18 || lat > 54 || lng < 73 || lng > 135) return undefined;
  let best = CHINA_CITIES[0];
  let bestD = Infinity;
  for (const c of CHINA_CITIES) {
    const d = (c.lat - lat) ** 2 + (c.lng - lng) ** 2;
    if (d < bestD) [best, bestD] = [c, d];
  }
  return { province: provinceByCode(best.provinceCode)?.name ?? "", provinceCode: best.provinceCode };
}

/** "四川省" → "四川", "内蒙古自治区" → "内蒙古" */
export function shortProvince(name: string): string {
  return name.replace(/(省|市|特别行政区|壮族自治区|回族自治区|维吾尔自治区|自治区)$/, "");
}
