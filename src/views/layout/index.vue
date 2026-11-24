<script setup>
import { ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useTravelPlanStore } from '@/stores/travelPlan';

const route = useRoute();
const router = useRouter();
//active是控制高亮的
const active = ref(0);

//行程规划状态：有正在查看/生成中的行程时，显示返回入口
const planStore = useTravelPlanStore();
const { active: planActive, loading: planLoading, query: planQuery } = storeToRefs(planStore);

const showPlanEntry = computed(() => planActive.value && route.path !== '/detail');

//回到正在查看的行程详情页
const goPlan = () => {
    router.push({
        path: '/detail',
        query: { ...planQuery.value }
    });
};

//tabbar与路由的对应关系
const tabRoutes = ['/', '/chat', '/profile'];

//路由变化时同步tabbar高亮（点击返回、浏览器返回时也能跟着变）
watch(() => route.path, (path) => {
    const index = tabRoutes.indexOf(path);
    if (index !== -1) {
        active.value = index;
    }
}, { immediate: true });

</script>

<template>
    <!-- 切换tab后也能回到正在查看的行程 -->
    <div v-if="showPlanEntry" class="plan-entry" @click="goPlan">
        <van-icon :name="planLoading ? 'clock-o' : 'guide-o'" size="18" />
        <span>{{ planLoading ? '行程生成中，点击查看' : '继续查看我的行程' }}</span>
    </div>
    <van-tabbar v-model="active">
        <van-tabbar-item to="/" icon="home-o">首页</van-tabbar-item>
        <van-tabbar-item to="/chat" icon="chat-o">对话</van-tabbar-item>
        <van-tabbar-item to="/profile" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
    <!-- 二级路由出口 -->
    <RouterView></RouterView>
</template>

<style scoped>
.plan-entry {
    position: fixed;
    right: 16px;
    bottom: 66px;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    border-radius: 22px;
    background-color: #1989fa;
    color: #fff;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(25, 137, 250, 0.4);
}
</style>
