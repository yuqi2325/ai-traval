import http from '../util/http';
import { isDemoMode, createMockPlan } from '@/mock';

//旅游行程规划推荐
export const getTravelRecommend = (data) => {
    //演示模式：直接返回本地模拟行程，结构对齐后端响应
    if (isDemoMode) {
        return createMockPlan(data);
    }
    return http.post('/api/travel/recommend', data);
};
