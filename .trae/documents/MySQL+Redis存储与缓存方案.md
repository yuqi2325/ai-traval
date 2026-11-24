# 为 demo 后端接入 MySQL 存储与 Redis 缓存

## Context

当前后端完全无状态：行程结果只在响应里返回、对话无上下文、重复规划每次都调大模型。前端把历史存在 `localStorage`，换设备即丢失。目标是在**不改前端**的前提下，为后端补上持久化与缓存：

- MySQL 落库：行程规划记录、对话消息（便于归档、以及 Redis 未命中时兜底复原）
- Redis：行程结果缓存、对话上下文、限流与防重复请求
- 前端代码保持原样，后端响应结构不变（`Result<TravelRecommend>` / SSE 事件格式）

用户已确认：MySQL 用 `root / 123456`（本机 MySQL80 已在运行）；Redis 采用 **Memurai** 安装在 Windows 本机（无 Docker、当前无 Redis）。

## 一、环境准备

1. 安装 Memurai（Redis 7 兼容 Windows 服务）：
   - 官方安装包：`https://www.memurai.com/get-memurai`（Developer Edition 免费），或 `choco install memurai-developer -y`
   - 安装后确认服务运行：`Get-Service Memurai`；连通测试 `memurai-cli ping` 应返回 `PONG`
   - 默认监听 `127.0.0.1:6379`，无需密码
2. MySQL：复用现有 MySQL80（3306），代码通过 JDBC URL 的 `createDatabaseIfNotExist=true` 自动建库 `ai_travel`，表由 JPA 自动创建。
3. **Redis 不可用时的降级**：所有 Redis 操作包在 `try/catch` 内，失败仅打 `warn` 日志并按「缓存未命中」处理，接口仍可正常返回；Redis 属于增强项，不阻断启动。

## 二、数据设计

### 2.1 MySQL（JPA `@Entity` + `ddl-auto: update` 自动建表）

`travel_plan_record`

| 列 | 类型 | 说明 |
| --- | --- | --- |
| id | BIGINT PK AUTO | 主键 |
| client_id | VARCHAR(64) | 客户端标识（见 2.3） |
| city | VARCHAR(64) | 城市 |
| days | INT | 天数 |
| budget | DECIMAL(12,2) | 预算 |
| success | TINYINT(1) | 业务是否成功 |
| plan_json | LONGTEXT | `TravelRecommend` 完整 JSON |
| created_at | DATETIME | 创建时间 |

索引：`idx_plan_query (city, days, budget, created_at)`，用于「同条件最近一次成功结果」兜底查询。

`chat_message`

| 列 | 类型 | 说明 |
| --- | --- | --- |
| id | BIGINT PK AUTO | 主键 |
| session_id | VARCHAR(64) | 会话标识 |
| client_id | VARCHAR(64) | 客户端标识 |
| role | VARCHAR(16) | `user` / `assistant` |
| content | TEXT | 消息内容 |
| created_at | DATETIME | 创建时间 |

索引：`idx_chat_session (session_id, id)`。

> 不建 user 表——前端未接入用户体系，账号仍写死在前端。

### 2.2 Redis 键设计

| Key | 类型 | TTL | 用途 |
| --- | --- | --- | --- |
| `travel:plan:{city}:{days}:{budget}` | String(JSON) | 24h | 行程结果缓存 |
| `travel:lock:{clientId}:{city}:{days}:{budget}` | String | 60s | 同客户端同条件并发防重复（`setIfAbsent`） |
| `chat:context:{sessionId}` | List | 2h | 对话上下文，仅保留最近 10 条（5 轮），`LPUSH` + `LTRIM` |
| `rate:chat:{clientId}:{yyyyMMddHHmm}` | String(计数) | 60s | 对话限流，每分钟最多 10 次 |

### 2.3 客户端与会话标识（前端不改的前提）

新增 `web/ClientIdResolver`：

- `clientId`：优先请求头 `X-Client-Id` → `X-Forwarded-For` 第一个 IP → `request.getRemoteAddr()`
- `sessionId`：优先 `X-Session-Id` → 否则复用 `clientId`

这样将来前端接入真实用户/会话时，只需在请求头补两个字段，后端无需再改。

## 三、代码改动清单

### 3.1 依赖（`demo/pom.xml`）

新增（版本由 Spring Boot parent 管理）：

- `spring-boot-starter-data-jpa`
- `com.mysql:mysql-connector-j`（`runtime`）
- `spring-boot-starter-data-redis`

### 3.2 配置（`demo/src/main/resources/application.yml`）

```yaml
spring:
  datasource:
    url: jdbc:mysql://127.0.0.1:3306/ai_travel?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&createDatabaseIfNotExist=true
    username: root
    password: "123456"
    driver-class-name: com.mysql.cj.jdbc.Driver
  jpa:
    hibernate:
      ddl-auto: update
    open-in-view: false
  data:
    redis:
      host: 127.0.0.1
      port: 6379
      timeout: 2s
```

保留原有 `server.port` 与 `llm` 配置。

### 3.3 新增文件（`demo/src/main/java/com/example/demo/`）

| 文件 | 职责 |
| --- | --- |
| `entity/TravelPlanRecord.java` | 规划记录实体 |
| `entity/ChatMessage.java` | 对话消息实体 |
| `repository/TravelPlanRecordRepository.java` | `findTopByCityAndDaysAndBudgetAndSuccessTrueOrderByCreatedAtDesc(...)` |
| `repository/ChatMessageRepository.java` | `findTop20BySessionIdOrderByIdDesc(...)`（用于 Redis 冷启动复原） |
| `service/PlanCacheService.java` | 行程缓存读写、防重复锁、MySQL 兜底查询（`StringRedisTemplate` + `ObjectMapper`） |
| `service/ChatMemoryService.java` | Redis 上下文读写、MySQL 消息落库、Redis 失效时从 MySQL 重建上下文 |
| `service/RateLimitService.java` | 对话限流 `INCR + EXPIRE`，超限返回 true |
| `web/ClientIdResolver.java` | 解析 `clientId` / `sessionId` |

### 3.4 修改文件

**`utils/LLMutils.java`**

- 新增重载 `chatStream(String systemPrompt, List<String> historyRoleContent..., String userPrompt, Consumer<String>)`，或更清晰：`chatStream(String systemPrompt, List<Map<String,String>> history, String userPrompt, Consumer<String>)`；
- `buildRequestBody` 增加 history 参数，把历史消息按 `{"role":..,"content":..}`（内容经 `escapeJson`）拼进 `messages`；
- 原 3 参 `chat` / `chatStream` 保留并委托给新方法（保持 recommend 现有调用不变）。

**`service/TravelService.java`**

- `recommend(city, days, budget, clientId)`：
  1. `PlanCacheService#tryLock` 失败 → 直接返回 `success=false, error="同类行程正在生成中，请稍后"`（不落库）
  2. Redis 命中 → 返回缓存结果（不落库、不调模型）
  3. Redis 未命中 → 查 MySQL 最近 7 天同条件成功记录，命中则回填 Redis 并返回
  4. 仍未命中 → 调模型 → 解析成功（`success=true` 且 `dailyItinerary` 非空）时写 Redis + 落库；解析失败只落库（`success=false`，便于排查 rawResponse）
  5. 所有缓存/落库操作独立 try/catch，失败不影响主流程
- `chat(message, clientId, sessionId)`：
  1. `RateLimitService` 超限 → 推送 `{"error":"请求过于频繁，请稍后再试"}` 后 complete（保持 SSE 事件格式，前端已有 error 分支）
  2. `ChatMemoryService#load(sessionId)` 取最近 10 条历史（Redis 空则回 MySQL 重建）；先把用户消息落库 + 追加 Redis
  3. 以「system + 历史 + 当前消息」调用 `LLMutils.chatStream` 新重载
  4. 流结束拿到完整回复后，落库 assistant 消息并追加 Redis

**`controller/TravelController.java`**

- `recommend` / `chat` 增加 `HttpServletRequest` 参数，用 `ClientIdResolver` 取 `clientId / sessionId` 后传给 Service（对前端仍是原 URL 与原请求体）。

### 3.5 不改的部分

- 响应 VO（`Result`、`TravelRecommend`、流式 VO）与 SSE 报文格式不变；
- 前端所有代码、`localStorage` 历史逻辑不变；
- `/api/travel/hello` 不变。

## 四、验证

1. `cd demo && mvn -o -q compile` 编译通过。
2. 启动后端，MySQL 自动建库建表；用 `mysql -h127.0.0.1 -uroot -p123456 -e "use ai_travel; show tables;"` 确认两张表存在。
3. 推荐接口：
   - 连续两次 `curl -X POST http://127.0.0.1:3200/api/travel/recommend -H "Content-Type: application/json" -d '{"city":"北京","days":2,"budget":22222}'`
   - 第二次应明显更快，日志显示缓存命中；`select id,city,days,budget,success,created_at from travel_plan_record order by id desc limit 5;` 有记录
   - `memurai-cli keys "travel:plan:*"` 能看到缓存键
4. 对话接口：`curl -N -X POST http://127.0.0.1:3200/api/travel/chat -H "Content-Type: application/json" -d '{"message":"北京有什么必去景点"}'`，正常流式输出；再发第二条，日志能带上前一轮上下文；`chat_message` 表有 user/assistant 记录；`memurai-cli lrange chat:context:<sessionId> 0 -1` 可看到上下文。
5. 限流：1 分钟内快速发 11 条对话，第 11 条收到 `{"error":"请求过于频繁..."}`。
6. 降级：`Stop-Service Memurai` 后再次调用推荐与对话，接口仍正常（日志仅 warn 缓存不可用）。
7. 前端回归：`npm run dev` 打开首页规划、详情折叠、对话、个人中心历史，行为与改造前一致。

## 五、文档同步

- `demo/后端项目文档.md`：新增「持久化与缓存」章节（表结构、Redis 键、配置、降级策略），技术栈补 JPA/MySQL/Redis，待办中移除「无持久化」。
- `项目整体架构.md`：总览图补 MySQL / Redis 节点，核心链路补充「缓存优先 → MySQL 兜底 → 模型」与「对话上下文」流程，限制表中移除「无持久化」，新增「无用户体系（clientId 来自 IP）」说明。

## 六、范围与局限

- 不新增用户注册登录、不做鉴权；
- 不新增历史查询接口（前端仍读 localStorage），MySQL 历史用于兜底与归档；
- `clientId` 在前端未传请求头时按 IP 推断，同一网络下多用户会共享缓存与上下文，属已知限制；
- API Key 明文问题不在本次范围内。
