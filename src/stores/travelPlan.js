import { defineStore } from 'pinia';
import { getTravelRecommend } from '@/apis/traval';
import { savePlanHistory, findPlanHistory } from '@/util/history';

//行程规划状态：放在store里，切换tab后请求和结果都不会丢
export const useTravelPlanStore = defineStore('travelPlan', {
    state: () => ({
        //当前查看的行程条件
        query: null,
        //AI规划行程的数据
        planData: null,
        loading: false,
        errorMsg: '',
        //是否有一个正在查看/生成中的行程（用于全局入口）
        active: false,
        //当前行程是否来自历史记录
        fromHistory: false,
        //请求序号，避免旧请求覆盖新条件的结果
        requestId: 0
    }),
    actions: {
        //打开某个条件的行程，条件相同时直接复用已有结果
        //useHistory为true时直接读历史记录里缓存的行程，不重新调接口
        open(query, useHistory = false) {
            const sameQuery = this.query &&
                this.query.city === query.city &&
                this.query.budget === query.budget &&
                this.query.days === query.days &&
                this.fromHistory === useHistory;
            if (this.active && sameQuery) {
                return;
            }
            this.query = { ...query };
            this.fromHistory = useHistory;
            this.planData = null;
            this.errorMsg = '';
            this.active = true;

            //查看历史记录：直接用缓存的结果
            if (useHistory) {
                const record = findPlanHistory(query);
                if (record?.planData) {
                    this.planData = record.planData;
                    this.loading = false;
                    return;
                }
            }
            this.fetchPlan();
        },
        //调用推荐接口
        async fetchPlan() {
            const currentId = ++this.requestId;
            this.loading = true;
            this.errorMsg = '';
            try {
                const res = await getTravelRecommend({
                    city: this.query.city,
                    budget: Number(this.query.budget),
                    days: Number(this.query.days)
                });
                if (currentId !== this.requestId) return;
                //该接口失败时返回HTTP 200 + {success: false, error: 'xxx'}，也要视为异常
                if (res?.success === false) {
                    this.errorMsg = res.error || '加载异常';
                    return;
                }
                this.planData = res.data;
                //记录到个人中心的规划历史
                savePlanHistory(this.query, res.data);
            } catch (e) {
                if (currentId !== this.requestId) return;
                //网络错误、超时、非2xx状态码等异常
                console.log(e);
                this.errorMsg = '加载异常';
            } finally {
                if (currentId === this.requestId) {
                    this.loading = false;
                }
            }
        },
        //关闭当前行程（返回上一页时调用）
        close() {
            this.requestId++;
            this.active = false;
            this.query = null;
            this.planData = null;
            this.errorMsg = '';
            this.loading = false;
        }
    }
});
