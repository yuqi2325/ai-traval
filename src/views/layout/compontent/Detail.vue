<script setup>
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useTravelPlanStore } from '@/stores/travelPlan';

const route = useRoute();
const router = useRouter();
const planStore = useTravelPlanStore();
//行程数据/加载状态都放在store里，切换tab后回来能继续查看
const { planData, loading, errorMsg } = storeToRefs(planStore);

//接收提交过来的表单数据
const fromData = ref({
    city: "",
    budget: "",
    days: ""
})

//当前展开的天（收起/展开）
const activeDays = ref([]);

//每天行程的时间段
const periods = [
    { key: 'morning', label: '上午' },
    { key: 'afternoon', label: '下午' },
    { key: 'evening', label: '晚上' }
];

//预算明细字段对应的中文名称
const budgetLabels = {
    accommodation: '住宿',
    food: '餐饮',
    transportation: '交通',
    tickets: '门票',
    other: '其他'
};

//行程数据变化时，默认只展开第一天
watch(planData, (data) => {
    const firstDay = data?.dailyItinerary?.[0]?.day;
    activeDays.value = firstDay ? [String(firstDay)] : [];
}, { immediate: true });

//进入页面时按条件打开行程；从历史记录进入时直接展示缓存结果
fromData.value.city = route.query.city;
fromData.value.budget = route.query.budget;
fromData.value.days = route.query.days;
//带上历史标记，切换tab后通过悬浮入口回来也能直接看缓存
const useHistory = route.query.history === '1';
const planQuery = { ...fromData.value };
if (useHistory) {
    planQuery.history = 1;
}
planStore.open(planQuery, useHistory);

//返回上一页：结束本次行程查看
const goBack = () => {
    planStore.close();
    router.back();
};
</script>

<template>
    <div class="page-container">
        <div class="content">
            <van-nav-bar title="行程详情" left-arrow @click-left="goBack" />
        </div>
        <div class="content">
            <div class="card">
                <div class="title">出行信息</div>
                <div class="info-item">城市：{{ fromData.city }}</div>
                <div class="info-item">预算：{{ fromData.budget }} 元</div>
                <div class="info-item">天数：{{ fromData.days }} 天</div>
            </div>
            <div class="card">
                <div class="title">AI 规划行程</div>
                <!-- 加载中：转圈 + 文字 -->
                <div v-if="loading" class="loading">
                    <van-loading size="28" color="#1989fa">正在获取数据</van-loading>
                </div>
                <!-- 加载异常：展示异常提示 + 重新加载 -->
                <div v-else-if="errorMsg" class="error">
                    <van-empty image="error" description="加载异常" />
                    <van-button type="primary" size="small" round @click="planStore.fetchPlan">重新加载</van-button>
                </div>
                <!-- 加载完成：展示AI规划的行程 -->
                <div v-else class="plan">
                    <!-- 每日行程：点击标题收起/展开 -->
                    <van-collapse v-model="activeDays" class="day-collapse">
                        <van-collapse-item
                            v-for="item in planData?.dailyItinerary || []"
                            :key="item.day"
                            :name="String(item.day)">
                            <template #title>
                                <span class="day-title">{{ item.date || `第${item.day}天` }}</span>
                            </template>
                            <div class="period" v-for="p in periods" :key="p.key" v-show="item[p.key]">
                                <div class="period-head">
                                    <span class="period-name">{{ p.label }}</span>
                                    <span class="period-spot">{{ item[p.key]?.spot }}</span>
                                </div>
                                <div class="meta">
                                    <van-tag plain type="primary">游玩 {{ item[p.key]?.duration }}</van-tag>
                                    <van-tag plain type="warning">门票 {{ item[p.key]?.ticket }}</van-tag>
                                </div>
                                <div class="line">
                                    <span class="line-label">交通：</span>{{ item[p.key]?.transportation }}
                                </div>
                                <div class="desc">{{ item[p.key]?.description }}</div>
                            </div>
                        </van-collapse-item>
                    </van-collapse>

                    <!-- 预算分配 -->
                    <div class="sub-title" v-if="planData?.budgetBreakdown">
                        预算分配（总预算 {{ planData.totalBudget }} 元）
                    </div>
                    <div v-if="planData?.budgetBreakdown">
                        <div class="budget-row" v-for="(value, key) in planData.budgetBreakdown" :key="key">
                            <span>{{ budgetLabels[key] || key }}</span>
                            <span class="amount">{{ value }} 元</span>
                        </div>
                    </div>

                    <!-- 温馨提示 -->
                    <div class="sub-title" v-if="planData?.tips?.length">温馨提示</div>
                    <div v-if="planData?.tips?.length">
                        <div class="list-item" v-for="(tip, index) in planData.tips" :key="index">
                            <van-icon name="info-o" />
                            <span>{{ tip }}</span>
                        </div>
                    </div>

                    <!-- 注意事项 -->
                    <div class="sub-title" v-if="planData?.warnings?.length">注意事项</div>
                    <div v-if="planData?.warnings?.length">
                        <div class="list-item warn" v-for="(warning, index) in planData.warnings" :key="index">
                            <van-icon name="warning-o" />
                            <span>{{ warning }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.page-container {
    min-height: 100vh;
    background-color: #f5f5f5;
    padding-bottom: 70px;
}

.content {
    padding: 16px;
}

.card {
    background-color: #fff;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 18px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.title {
    font-size: 16px;
    font-weight: bold;
    color: #333;
    margin-bottom: 12px;
}

.info-item {
    font-size: 14px;
    color: #666;
    line-height: 24px;
}

.loading {
    display: flex;
    justify-content: center;
    padding: 40px 0;
}

.error {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.plan {
    font-size: 14px;
    color: #333;
    line-height: 24px;
}

.day-title {
    display: inline-block;
    font-size: 15px;
    font-weight: bold;
    color: #323233;
    padding-left: 10px;
    border-left: 4px solid #1989fa;
}

.day-collapse :deep(.van-cell) {
    padding-left: 0;
    padding-right: 0;
}

.day-collapse :deep(.van-collapse-item__content) {
    padding: 8px 0 12px;
}

.period {
    background-color: #f7f8fa;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 10px;
}

.period:last-child {
    margin-bottom: 0;
}

.period-head {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
}

.period-name {
    flex-shrink: 0;
    font-size: 12px;
    color: #fff;
    background-color: #1989fa;
    border-radius: 10px;
    padding: 0 8px;
    margin-right: 8px;
    line-height: 20px;
}

.period-spot {
    font-size: 14px;
    font-weight: bold;
    color: #323233;
}

.meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
}

.line {
    font-size: 13px;
    color: #666;
    line-height: 22px;
}

.line-label {
    color: #969799;
}

.desc {
    font-size: 13px;
    color: #666;
    line-height: 22px;
    margin-top: 6px;
    word-break: break-all;
}

.sub-title {
    font-size: 15px;
    font-weight: bold;
    color: #323233;
    padding-left: 10px;
    border-left: 4px solid #ff976a;
    margin: 18px 0 10px;
}

.budget-row {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    color: #666;
    line-height: 30px;
    border-bottom: 1px dashed #ebedf0;
}

.budget-row:last-child {
    border-bottom: none;
}

.budget-row .amount {
    color: #323233;
}

.list-item {
    display: flex;
    font-size: 13px;
    color: #666;
    line-height: 22px;
    margin-bottom: 8px;
}

.list-item .van-icon {
    flex-shrink: 0;
    margin-top: 4px;
    margin-right: 6px;
    color: #1989fa;
}

.list-item.warn .van-icon {
    color: #ff976a;
}
</style>
