<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import { isDemoMode } from '@/mock';

const router = useRouter();
//演示模式下明确提示数据来源，避免误解为真实大模型输出
const noticeText = isDemoMode
    ? '演示模式：行程与对话均为本地模拟数据'
    : '基于AI的智能景点介绍与行程规划系统';
const fromData = ref({
    "city": "",
    "budget": "",
    "days": ""
});
//旅游行程规划提交
const onSubmit = () => {
    console.log('submit');
    //校验
    if (!fromData.value.city) {
        showToast('请选择城市');
        return;
    }
    if (!fromData.value.budget || fromData.value.budget <= 100) {
        showToast('请输入正确的预算（100元以上）');
        return;
    }
    if (!fromData.value.days ||  fromData.value.days < 1 || fromData.value.days > 30) {
        showToast('请输入正确的天数（1-30天）');
        return;
    }
    //跳转详情页
    router.push({
        path:'/detail',
        query:{
            city:fromData.value.city,
            budget:fromData.value.budget,
            days:fromData.value.days
        }
    })

}
const columns = [
    { text: '北京', value: 'Beijing' },
    { text: '上海', value: 'Shanghai' },
    { text: '广州', value: 'Guangzhou' },
    { text: '深圳', value: 'Shenzhen' },
    { text: '成都', value: 'Chengdu' },
    { text: '杭州', value: 'Hangzhou' },
    { text: '西安', value: "Xi'an" },
    { text: '重庆', value: 'Chongqing' },
    { text: '南京', value: 'Nanjing' },
    { text: '武汉', value: 'Wuhan' },
    { text: '苏州', value: 'Suzhou' },
    { text: '长沙', value: 'Changsha' },
    { text: '天津', value: 'Tianjin' },
    { text: '郑州', value: 'Zhengzhou' },
    { text: '济南', value: 'Jinan' },
    { text: '青岛', value: 'Qingdao' },
    { text: '大连', value: 'Dalian' },
    { text: '沈阳', value: 'Shenyang' },
    { text: '哈尔滨', value: 'Harbin' },
    { text: '长春', value: 'Changchun' },
    { text: '福州', value: 'Fuzhou' },
    { text: '厦门', value: 'Xiamen' },
    { text: '南昌', value: 'Nanchang' },
    { text: '合肥', value: 'Hefei' },
    { text: '昆明', value: 'Kunming' },
    { text: '贵阳', value: 'Guiyang' },
    { text: '南宁', value: 'Nanning' },
    { text: '桂林', value: 'Guilin' },
    { text: '海口', value: 'Haikou' },
    { text: '三亚', value: 'Sanya' },
    { text: '丽江', value: 'Lijiang' },
    { text: '大理', value: 'Dali' },
    { text: '兰州', value: 'Lanzhou' },
    { text: '乌鲁木齐', value: 'Urumqi' },
    { text: '拉萨', value: 'Lhasa' },
    { text: '呼和浩特', value: 'Hohhot' },
    { text: '太原', value: 'Taiyuan' },
    { text: '石家庄', value: 'Shijiazhuang' },
];
const fieldValue = ref('');
const showPicker = ref(false);

const hotCities = ['北京', '上海', '广州', '深圳', '成都', '杭州', '西安', '重庆'];

const onConfirm = ({ selectedOptions }) => {
    showPicker.value = false;
    fieldValue.value = selectedOptions[0].text;
    fromData.value.city = selectedOptions[0].text;
}
//跳转页面
const goPage = (path) => {
    router.push(path);
}

//选择城市
const selectedCity = (city) => {
    fromData.value.city = city;
    fieldValue.value = city;
}
</script>
<template>
    <div class="page-container">
        <div class="content">
            <van-nav-bar title="智能旅游助手" />
        </div>
        <div class="content">
            <!-- 公告栏 -->
            <van-notice-bar left-icon="volume-o" :text="noticeText" />
        </div>
        <div class="content">
            <div class="card">
                <div class="title">
                    规划你得旅程
                </div>
                <div>
                    <van-form @submit="onSubmit">
                        <van-cell-group inset>
                            <van-field v-model="fieldValue" is-link readonly label="城市" placeholder="选择城市"
                                @click="showPicker = true" />
                            <van-popup v-model:show="showPicker" round position="bottom">
                                <van-picker :columns="columns" @cancel="showPicker = false" @confirm="onConfirm" />
                            </van-popup>
                            <van-field v-model="fromData.budget" name="预算" label="预算(元)" placeholder="预算"
                                :rules="[{ required: true, message: '请填写预算' }]" />
                            <van-field v-model="fromData.days" name="天数" label="天数" placeholder="天数"
                                :rules="[{ required: true, message: '请填写天数' }]" />
                        </van-cell-group>
                        <van-button type="primary" block round @click="onSubmit">
                            开始规划你的行程
                        </van-button>
                    </van-form>
                </div>
            </div>
            <div class="card">
                <div class="title">
                    快捷入口
                </div>
                <div class="quick-entry">
                    <div @click="goPage('/chat')" class="entry-item">
                        <van-icon name="chat-o" size="30" />
                        <span>AI 对话</span>
                    </div>
                    <div @click="goPage('/profile')" class="entry-item">
                        <van-icon name="user-o" size="30" />
                        <span>我的</span>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="title">
                    热门目的地
                </div>
                <div class="hot-destinations">
                    <span @click="selectedCity(city)" class="destination-tag" :class="{ active: fromData.city === city }"
                        v-for="city in hotCities" :key="city">{{ city }}</span>
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
}

.quick-entry {
    display: flex;
    gap: 12px;
    margin-top: 16px;
}

.entry-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 15px 0;
    background-color: #f8f8f8;
    border: 1px solid #ebedf0;
    border-radius: 4px;
    font-size: 14px;
    color: #333;
}

.hot-destinations {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px 16px;
    margin-top: 16px;
}

.destination-tag {
    padding: 8px 0;
    text-align: center;
    background-color: #f7f8fa;
    border: 1px solid #ebedf0;
    border-radius: 16px;
    font-size: 14px;
    color: #666;
}

.destination-tag.active {
    background-color: #1989fa;  
    color: #fff;
}
</style>