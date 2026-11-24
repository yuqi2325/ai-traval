import { beforeEach, describe, expect, it } from 'vitest';
import { clearPlanHistory, findPlanHistory, getPlanHistory, savePlanHistory } from '@/util/history';

const plan = (city, budget = 3000, days = 2) => ({ city, budget, days });

describe('行程历史记录', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('保存后可以按条件查回', () => {
        savePlanHistory(plan('北京'), { city: '北京' });
        savePlanHistory(plan('上海'), { city: '上海' });

        expect(getPlanHistory()).toHaveLength(2);
        expect(findPlanHistory(plan('北京'))?.planData.city).toBe('北京');
        expect(findPlanHistory(plan('广州'))).toBeUndefined();
    });

    it('相同条件覆盖旧记录，最新记录排在最前', () => {
        savePlanHistory(plan('北京'), { city: '北京', version: 1 });
        savePlanHistory(plan('上海'), { city: '上海' });
        savePlanHistory(plan('北京'), { city: '北京', version: 2 });

        const list = getPlanHistory();
        expect(list).toHaveLength(2);
        expect(list[0].planData.version).toBe(2);
    });

    it('最多保留 30 条记录', () => {
        for (let i = 0; i < 35; i += 1) {
            savePlanHistory(plan(`城市${i}`), { city: `城市${i}` });
        }
        expect(getPlanHistory()).toHaveLength(30);
    });

    it('清空后返回空数组', () => {
        savePlanHistory(plan('北京'), { city: '北京' });
        clearPlanHistory();
        expect(getPlanHistory()).toEqual([]);
    });
});
