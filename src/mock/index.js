// 演示模式：没有后端时使用本地模拟数据，便于 GitHub Pages 等纯静态部署
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

// 热门城市的代表性景点，用于拼装每日行程
const CITY_SPOTS = {
    '北京': ['故宫博物院', '八达岭长城', '颐和园', '天坛公园', '什刹海', '南锣鼓巷', '国家博物馆', '景山公园', '王府井'],
    '上海': ['外滩', '豫园', '上海博物馆', '武康路', '田子坊', '陆家嘴', '朱家角古镇', '思南公馆', '南京路步行街'],
    '广州': ['广州塔', '陈家祠', '沙面岛', '越秀公园', '上下九步行街', '广东省博物馆', '白云山', '永庆坊', '珠江夜游'],
    '深圳': ['世界之窗', '深圳湾公园', '华侨城创意园', '大鹏所城', '莲花山公园', '深圳博物馆', '东门老街', '甘坑古镇', '海上世界'],
    '成都': ['宽窄巷子', '大熊猫繁育研究基地', '武侯祠', '锦里', '杜甫草堂', '人民公园', '春熙路', '青城山', '九眼桥'],
    '杭州': ['西湖', '灵隐寺', '西溪湿地', '河坊街', '浙江省博物馆', '雷峰塔', '龙井村', '京杭大运河', '宋城'],
    '西安': ['秦始皇兵马俑', '大雁塔', '西安城墙', '回民街', '陕西历史博物馆', '钟鼓楼', '大唐不夜城', '华清宫', '碑林博物馆'],
    '重庆': ['洪崖洞', '解放碑', '磁器口古镇', '长江索道', '南山一棵树', '三峡博物馆', '李子坝', '鹅岭二厂', '朝天门']
};

const DEFAULT_SPOTS = ['城市地标', '当地博物馆', '历史街区', '城市公园', '特色夜市', '滨水步道', '艺术街区', '观景平台', '老街'];

const pickSpots = (city) => {
    const list = CITY_SPOTS[city];
    if (list) return list;
    return DEFAULT_SPOTS.map((name) => `${city}${name}`);
};

const createTimesLot = (city, spot, period) => {
    if (period === 'morning') {
        return {
            spot,
            duration: '3 小时',
            ticket: '60 元',
            transportation: '地铁 + 步行',
            description: `${spot}是${city}的代表性景点，上午人流相对较少，适合先游览核心区域。`
        };
    }
    if (period === 'afternoon') {
        return {
            spot,
            duration: '2.5 小时',
            ticket: '40 元',
            transportation: '公交 + 步行',
            description: `午后前往${spot}，可以慢慢逛展或散步，避开正午高温。`
        };
    }
    return {
        spot,
        duration: '2 小时',
        ticket: '免费',
        transportation: '步行',
        description: `傍晚在${spot}附近用餐并感受夜景，为这一天收尾。`
    };
};

// 按城市/预算/天数生成一份模拟行程，结构对齐后端 TravelRecommend
export const createMockPlan = ({ city, budget, days }) => {
    const totalBudget = Number(budget);
    const dayCount = Math.max(1, Number(days) || 1);
    const spots = pickSpots(city);

    const dailyItinerary = Array.from({ length: dayCount }, (_, index) => {
        const offset = index * 3;
        return {
            day: String(index + 1),
            date: `第${index + 1}天`,
            morning: createTimesLot(city, spots[offset % spots.length], 'morning'),
            afternoon: createTimesLot(city, spots[(offset + 1) % spots.length], 'afternoon'),
            evening: createTimesLot(city, spots[(offset + 2) % spots.length], 'evening')
        };
    });

    const accommodation = Math.round(totalBudget * 0.35);
    const food = Math.round(totalBudget * 0.25);
    const transportation = Math.round(totalBudget * 0.18);
    const tickets = Math.round(totalBudget * 0.12);

    const plan = {
        success: true,
        city,
        days: dayCount,
        totalBudget,
        dailyItinerary,
        budgetBreakdown: {
            accommodation,
            food,
            transportation,
            tickets,
            other: totalBudget - accommodation - food - transportation - tickets
        },
        tips: [
            `${city}热门景点建议提前在官方渠道预约门票，避免现场限流。`,
            `按 ${dayCount} 天行程安排，日均步行较多，建议穿舒适的鞋子。`,
            '跨区出行优先选择地铁，早晚高峰尽量错峰。'
        ],
        warnings: [
            '节假日人流较大，请为热门景点预留排队时间。',
            '演示模式：以上内容为本地模拟数据，并非真实大模型输出。'
        ],
        error: null,
        rawResponse: null
    };

    // 模拟网络耗时，让加载态可见
    return new Promise((resolve) => {
        setTimeout(() => resolve({ success: true, data: plan }), 600);
    });
};

const CHAT_ANSWERS = [
    {
        keywords: ['北京', '景点'],
        content: '北京值得优先安排的有故宫博物院、八达岭长城和颐和园：故宫建议上午入宫，预留 3-4 小时；长城可坐高铁到八达岭，安排半天；颐和园适合下午慢慢逛。天坛、什刹海和南锣鼓巷可以作为第二天或傍晚的补充。'
    },
    {
        keywords: ['美食', '吃'],
        content: '美食可以按城市来选：北京试试烤鸭和炸酱面，上海推荐生煎和本帮菜，成都必吃火锅、串串和担担面，西安则以肉夹馍、羊肉泡馍和凉皮为主。尽量避开景区正门口的店，往居民区走一两公里通常更地道。'
    },
    {
        keywords: ['成都', '三日'],
        content: '成都三日可以这样安排：第一天宽窄巷子、人民公园和春熙路；第二天大熊猫基地、武侯祠和锦里；第三天青城山或都江堰一日往返。晚上可以去九眼桥看夜景，火锅建议提前排号。'
    },
    {
        keywords: ['保险'],
        content: '选择旅行保险时重点看三点：一是医疗与意外保额是否覆盖目的地消费水平；二是是否包含航班延误、行李丢失等常见责任；三是免责条款，尤其是高风险运动。短途国内游选基础款即可，出境游建议加上紧急救援服务。'
    }
];

const FALLBACK_ANSWER = '这是演示模式下的模拟回复。真实版本会由 Spring Boot 后端调用大模型，并通过 SSE 逐个分片推送到前端，实现打字机效果。你可以试试问「北京有哪些必去的景点」或「成都三日游攻略」。';

const pickAnswer = (message = '') => {
    const hit = CHAT_ANSWERS.find((item) => item.keywords.some((keyword) => message.includes(keyword)));
    return hit ? hit.content : FALLBACK_ANSWER;
};

// 模拟 SSE 流式返回：按小片段推送，前端解析逻辑与真实后端一致
export const mockChatStream = (message, onChunk, onComplete) => {
    const answer = pickAnswer(message);
    let cursor = 0;
    const timer = setInterval(() => {
        if (cursor >= answer.length) {
            clearInterval(timer);
            onComplete?.();
            return;
        }
        const piece = answer.slice(cursor, cursor + 3);
        cursor += 3;
        onChunk?.(`data:${JSON.stringify({ content: piece, type: 'chunk' })}\n\n`);
    }, 40);
};
