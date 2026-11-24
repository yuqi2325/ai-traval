<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { showConfirmDialog, showToast } from 'vant';
import { getPlanHistory, clearPlanHistory } from '@/util/history';

const router = useRouter();

//用户信息（先写死）
const userInfo = {
    username: '旅行者小游',
    account: 'ai_travel_001'
};

//规划历史记录
const historyList = ref(getPlanHistory());

//格式化时间 YYYY-MM-DD HH:mm
const formatTime = (time) => {
    const d = new Date(time);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

//点击历史记录，直接查看当时保存的行程（不重新调接口）
const goDetail = (item) => {
    router.push({
        path: '/detail',
        query: {
            city: item.city,
            budget: item.budget,
            days: item.days,
            history: 1
        }
    });
};

//清空历史记录
const onClear = async () => {
    try {
        await showConfirmDialog({ title: '提示', message: '确定清空全部规划记录吗？' });
    } catch (e) {
        return;
    }
    clearPlanHistory();
    historyList.value = [];
    showToast('已清空');
};
</script>

<template>
    <div class="page-container">
        <div class="content">
            <van-nav-bar title="个人中心" />
        </div>
        <div class="content">
            <div class="card user-card">
                <van-icon name="user-circle-o" size="56" color="#1989fa" />
                <div class="user-info">
                    <div class="username">{{ userInfo.username }}</div>
                    <div class="account">账号：{{ userInfo.account }}</div>
                </div>
            </div>
            <div class="card">
                <div class="title-row">
                    <span class="title">规划历史</span>
                    <span v-if="historyList.length" class="clear-btn" @click="onClear">清空</span>
                </div>
                <van-empty v-if="!historyList.length" description="还没有规划记录" />
                <div v-else class="history-list">
                    <div class="history-item" v-for="item in historyList" :key="item.id" @click="goDetail(item)">
                        <div class="history-main">
                            <div class="history-city">{{ item.city }}</div>
                            <div class="history-meta">{{ item.days }} 天 · 预算 {{ item.budget }} 元</div>
                        </div>
                        <div class="history-time">
                            <span>{{ formatTime(item.createdAt) }}</span>
                            <van-icon name="arrow" />
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

.user-card {
    display: flex;
    align-items: center;
    gap: 16px;
}

.username {
    font-size: 18px;
    font-weight: bold;
    color: #333;
    margin-bottom: 6px;
}

.account {
    font-size: 13px;
    color: #969799;
}

.title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}

.title {
    font-size: 16px;
    font-weight: bold;
    color: #333;
}

.clear-btn {
    font-size: 13px;
    color: #969799;
}

.history-list {
    margin-top: 4px;
}

.history-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px dashed #ebedf0;
}

.history-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
}

.history-city {
    font-size: 15px;
    font-weight: bold;
    color: #333;
    margin-bottom: 4px;
}

.history-meta {
    font-size: 13px;
    color: #666;
}

.history-time {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    font-size: 12px;
    color: #969799;
}
</style>
