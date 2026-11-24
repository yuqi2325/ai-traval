import axios from 'axios';
import { showToast } from 'vant';
import { isDemoMode, mockChatStream } from '@/mock';

//后端地址：留空时走同源（开发环境由 vite 代理转发到 127.0.0.1:3200）
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

//axios二次封装
const http = axios.create({
    baseURL: API_BASE,
    timeout: 60000
});

//处理流式接口  分别是请求地址、请求数据、数据处理函数、完成函数、错误函数
export async function fetchStream(url, data, onChunk, onComplete, onError) {
    //演示模式：没有后端时用本地模拟数据，保持相同的流式回调形式
    if (isDemoMode) {
        mockChatStream(data?.message, onChunk, onComplete, onError);
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/api/travel/${url}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        //创建响应体的可读流读取器
        const reader = response.body.getReader();
        //将二进制数据转化为字符串
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            const chunk = decoder.decode(value, { stream: true });
            onChunk?.(chunk);
        }
        onComplete?.();
    } catch (e) {
        onError?.(e);
    }
}
//请求拦截器
http.interceptors.request.use(
    (config) => {
        //统一添加token（有需要时启用）
        // config.headers.token = 'xxx';
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

//响应拦截器
http.interceptors.response.use(
    (response) => {
        //直接返回响应数据，调用处不用再 .data
        return response.data;
    },
    (error) => {
        showToast(error.response?.data?.message || '网络异常，请稍后重试');
        return Promise.reject(error);
    }
);

export default http;
