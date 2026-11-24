<script setup>
import { ref, nextTick, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import http, { fetchStream } from '@/util/http';
import { isDemoMode } from '@/mock';

const router = useRouter();

const goBack = () => {
    router.back();
}

//聊天记录
const messageList = ref([]);
//输入框内容
const inputText = ref('');
//AI是否正在回复（回复期间禁止再次发送）
const isBusy = ref(false);
//AI是否在思考中（还没收到第一个内容分片）
const isThinking = ref(false);

//常见问题
const hotQuestions = [
    '北京有哪些必去的景点？',
    '上海美食推荐',
    '成都三日游攻略',
    '如何选择旅行保险？'
];

//聊天区域容器
const chatBody = ref(null);

//新消息出现后滚动到底部
const scrollToBottom = () => {
    nextTick(() => {
        chatBody.value?.scrollTo({ top: chatBody.value.scrollHeight, behavior: 'smooth' });
    });
};

//格式化当前时间 HH:mm
const formatTime = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
};

//刷新页面时从数据库回显当前会话的历史对话
const loadHistory = async () => {
    //演示模式没有后端历史接口
    if (isDemoMode) return;
    try {
        const res = await http.get('/api/travel/chat/history');
        if (!res?.success) return;
        const list = res.data || [];
        //用户已经开始新对话时不再覆盖
        if (messageList.value.length > 0 || list.length === 0) return;
        messageList.value = list.map((msg) => ({
            role: msg.role,
            content: msg.content,
            time: msg.time
        }));
        scrollToBottom();
    } catch (e) {
        //历史加载失败不阻断正常聊天
    }
};

onMounted(loadHistory);

//发送消息
const onSend = (text) => {
    const question = (typeof text === 'string' ? text : inputText.value).trim();
    if (!question) return;
    //AI还在回复时禁止再次发送
    if (isBusy.value) return;
    //追加用户消息
    messageList.value.push({ role: 'user', content: question, time: formatTime() });
    inputText.value = '';
    isBusy.value = true;
    isThinking.value = true;
    scrollToBottom();

    let aiMsg = null; //正在输出的AI气泡
    let buffer = ''; //分片缓冲区（一行数据可能被网络拆成多个分片）

    //把解析出的内容追加到AI气泡里
    const appendContent = (content) => {
        if (!content) return;
        isThinking.value = false;
        if (!aiMsg) {
            messageList.value.push({ role: 'ai', content, time: formatTime() });
            //取响应式代理对象，保证后续修改能触发视图更新
            aiMsg = messageList.value[messageList.value.length - 1];
        } else {
            aiMsg.content += content;
        }
        scrollToBottom();
    };

    //从一行流式数据中提取AI回复内容（只取data.content）
    const extractContent = (line) => {
        const t = line.trim();
        if (!t) return '';
        //兼容SSE格式，去掉data:前缀
        const payload = t.startsWith('data:') ? t.slice(5).trim() : t;
        if (!payload || payload === '[DONE]') return '';
        try {
            const obj = JSON.parse(payload);
            //流式数据结构：data:{"type":"chunk","content":"..."}
            return obj.content ?? '';
        } catch (e) {
            return ''; //不完整或非JSON的行，忽略
        }
    };

    //调用AI流式接口，把AI的回复追加到消息列表
    fetchStream('chat', { message: question }, (raw) => {
        //先攒到缓冲区，再按行切割解析
        buffer += raw;
        const lines = buffer.split('\n');
        buffer = lines.pop(); //最后一段可能不完整，留在缓冲区
        for (const line of lines) {
            appendContent(extractContent(line));
        }
    }, () => {
        //流结束：解析缓冲区里剩余的最后一行，解除发送限制
        appendContent(extractContent(buffer));
        isBusy.value = false;
        isThinking.value = false;
    }, () => {
        isBusy.value = false;
        isThinking.value = false;
        showToast('加载异常，请稍后重试');
    });
}
</script>

<template>
    <div class="chat-page">
        <!-- 顶部导航：固定不动 -->
        <div class="content">
            <van-nav-bar left-arrow left-text="返回" @click-left="goBack" fixed title="AI 旅游助手" />
        </div>
        <!-- 中间聊天区域：只有这里滚动 -->
        <div class="chat-body" ref="chatBody">
            <!-- 空状态：欢迎语 + 常见问题 -->
            <div v-if="messageList.length === 0" class="empty-state">
                <van-icon name="chat-o" size="80" color="#dcdee0" />
                <div class="empty-text">开始和 AI 助手对话吧！</div>
                <div class="hot-title">常见问题</div>
                <div class="hot-questions">
                    <van-tag class="question-tag" size="large" mark  v-for="q in hotQuestions" :key="q" @click="onSend(q)">{{ q }}</van-tag>
                </div>
            </div>
            <!-- 消息列表 -->
            <div v-else class="message-list">
                <div v-for="(msg, index) in messageList" :key="index" class="message-row"
                    :class="msg.role === 'user' ? 'right' : 'left'">
                    <div class="msg-item">
                        <div class="bubble" :class="msg.role">{{ msg.content }}</div>
                        <span class="bubble-time">{{ msg.time }}</span>
                    </div>
                </div>
                <!-- AI思考中：还没收到第一个内容分片时显示 -->
                <div v-if="isThinking" class="message-row left">
                    <div class="bubble ai thinking">
                        <van-loading size="16" />
                        <span>AI 思考中...</span>
                    </div>
                </div>
            </div>
        </div>
        <!-- 底部输入栏 -->
        <div class="input-bar">
            <input v-model="inputText" class="chat-input" placeholder="输入您的问题..." @keyup.enter="onSend()" />
            <van-button type="primary" class="send-btn" :disabled="isBusy" @click="onSend()">发送</van-button>
        </div>
    </div>
</template>

<style scoped>
.chat-page {
    /* 减去底部tabbar的50px高度 */
    height: calc(100vh - 50px);
    background-color: #f5f5f5;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.content {
    flex-shrink: 0;
    padding: 16px;
}

/* 中间聊天区域：独立滚动，导航栏和输入栏固定不动 */
.chat-body {
    flex: 1;
    overflow-y: auto;
}

.empty-state {
    min-height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.empty-text {
    margin-top: 16px;
    font-size: 14px;
    color: #999;
}

.hot-title {
    margin: 48px 0 16px;
    font-size: 14px;
    color: #999;
}

.hot-questions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
    padding: 0 24px;
}

.message-list {
    padding: 16px;
}

/* 新消息入场动画：上滑+缩放+淡入，模拟微信发消息的效果 */
.message-row {
    display: flex;
    margin-bottom: 12px;
    animation: msg-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.message-row.left {
    justify-content: flex-start;
    transform-origin: bottom left;
}

.message-row.right {
    justify-content: flex-end;
    transform-origin: bottom right;
}

@keyframes msg-in {
    from {
        opacity: 0;
        transform: translateY(24px) scale(0.92);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.bubble {
    max-width: 100%;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 14px;
    line-height: 22px;
    white-space: pre-wrap;
    word-break: break-all;
}

.bubble.user {
    background-color: #1989fa;
    color: #fff;
    border-radius: 13px 13px 0px 13px;
}

.bubble.ai {
    background-color: #fff;
    color: #333;
    border-radius: 13px 13px 13px 0px;
}

/* 包裹气泡和时间的容器：宽度由内容决定 */
.msg-item {
    display: flex;
    flex-direction: column;
    max-width: 75%;
}

/* 气泡外右下角的时间 */
.bubble-time {
    margin-top: 2px;
    align-self: flex-end;
    font-size: 10px;
    line-height: 1;
    color: #c8c9cc;
}

/* AI思考中的气泡 */
.bubble.thinking {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #999;
}

.input-bar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background-color: #f7f8fa;
}

.chat-input {
    flex: 1;
    height: 36px;
    padding: 0 14px;
    background-color: #fff;
    border: 1px solid #ebedf0;
    border-radius: 18px;
    font-size: 14px;
    color: #333;
    outline: none;
}

.chat-input::placeholder {
    color: #c8c9cc;
}

.send-btn {
    height: 36px;
    padding: 0 18px;
    border-radius: 18px;
}
</style>
