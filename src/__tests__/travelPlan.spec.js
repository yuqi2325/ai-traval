import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@/apis/traval', () => ({
    getTravelRecommend: vi.fn()
}));

import { getTravelRecommend } from '@/apis/traval';
import { useTravelPlanStore } from '@/stores/travelPlan';

const query = { city: '北京', budget: 3000, days: 2 };

describe('travelPlan store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('加载成功后写入行程并保存历史', async () => {
        getTravelRecommend.mockResolvedValue({
            success: true,
            data: { city: '北京', days: 2, dailyItinerary: [] }
        });

        const store = useTravelPlanStore();
        store.open({ ...query });

        expect(store.loading).toBe(true);
        await vi.waitFor(() => expect(store.loading).toBe(false));

        expect(store.planData.city).toBe('北京');
        expect(store.active).toBe(true);
        expect(JSON.parse(localStorage.getItem('travelPlanHistory'))).toHaveLength(1);
    });

    it('业务失败时展示后端错误信息', async () => {
        getTravelRecommend.mockResolvedValue({ success: false, error: '旅游推荐失败' });

        const store = useTravelPlanStore();
        store.open({ ...query });

        await vi.waitFor(() => expect(store.loading).toBe(false));
        expect(store.errorMsg).toBe('旅游推荐失败');
        expect(store.planData).toBeNull();
    });

    it('旧请求返回时不覆盖新条件下的结果', async () => {
        let resolveFirst;
        getTravelRecommend
            .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
            .mockResolvedValueOnce({ success: true, data: { city: '上海' } });

        const store = useTravelPlanStore();
        store.open({ ...query });
        store.open({ city: '上海', budget: 5000, days: 3 });

        await vi.waitFor(() => expect(store.planData?.city).toBe('上海'));

        resolveFirst({ success: true, data: { city: '北京' } });
        await Promise.resolve();
        await Promise.resolve();

        expect(store.planData.city).toBe('上海');
    });
});
