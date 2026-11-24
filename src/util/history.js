//行程规划历史记录：本地存储读写
const HISTORY_KEY = 'travelPlanHistory';

//读取历史记录（最新的在最前面）
export const getPlanHistory = () => {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch (e) {
        return [];
    }
};

//保存一条规划记录（连同行程结果一起存，下次点击历史可直接查看），相同城市/预算/天数的旧记录会被覆盖
export const savePlanHistory = (plan, planData) => {
    const list = getPlanHistory();
    const record = {
        id: Date.now(),
        city: plan.city,
        budget: Number(plan.budget),
        days: Number(plan.days),
        createdAt: Date.now(),
        planData
    };
    const rest = list.filter(item => !(item.city === record.city && item.budget === record.budget && item.days === record.days));
    localStorage.setItem(HISTORY_KEY, JSON.stringify([record, ...rest].slice(0, 30)));
};

//按城市/预算/天数查找历史记录
export const findPlanHistory = (plan) => {
    const budget = Number(plan.budget);
    const days = Number(plan.days);
    return getPlanHistory().find(item => item.city === plan.city && item.budget === budget && item.days === days);
};

//清空历史记录
export const clearPlanHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
};
