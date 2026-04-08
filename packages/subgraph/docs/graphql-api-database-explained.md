# GraphQL 是怎么通过 API 查询数据库的

这篇文档想回答一个很常见、也很关键的问题：

> GraphQL 到底是什么？它为什么看起来像“直接查数据”，但又不是在前端直接写 SQL 查数据库？

如果你先会的是前端和普通 API，这样理解最顺：

- `SQL` 是你对数据库说的话
- `REST / GraphQL` 是你对后端 API 说的话
- 后端再决定怎么去查数据库

也就是说：

`前端 -> GraphQL API -> 服务端执行查询 -> 底层数据库 / 索引库 -> 返回 JSON`

不是：

`前端 -> 直接连数据库`

---

## 1. 先一句话认识 GraphQL

GraphQL 是一种 **API 查询语言 + 运行时规范**。

它主要解决的是这件事：

- 客户端只声明“我要哪些字段”
- 服务端按这个结构把数据组装好后返回

比如你只想拿消息的标题和作者，就可以只查这两个字段，而不是把整条记录全拿回来。

```graphql
query {
  messages(first: 2) {
    title
    author
  }
}
```

服务端返回：

```json
{
  "data": {
    "messages": [
      {
        "title": "hello",
        "author": "0x123..."
      },
      {
        "title": "second",
        "author": "0x456..."
      }
    ]
  }
}
```

你可以先把 GraphQL 想成：

- 它不是数据库
- 它不是 ORM
- 它是“站在数据库前面的 API 查询层”

---

## 2. 它和 REST、SQL 分别是什么关系

很多人第一次学 GraphQL 会把这三层混在一起。其实它们不在一个层面。

### SQL

SQL 是查数据库的语言，比如：

```sql
SELECT title, author FROM messages ORDER BY created_at DESC LIMIT 2;
```

这句话通常是后端在用，不是浏览器直接用。

### REST

REST 更像是“后端提前设计好的 URL”：

```text
GET /messages
GET /messages/123
GET /users/1/messages
```

客户端请求哪个接口，能拿到什么数据，通常由后端先定死。

### GraphQL

GraphQL 更像是：

- URL 往往只有一个 endpoint
- 客户端把“我要什么字段”写在 query 里
- 服务端按 schema 和 resolver 去执行

常见请求方式：

```text
POST /graphql
Content-Type: application/json
```

请求体：

```json
{
  "query": "query { messages { title author } }"
}
```

所以你可以记成：

- `SQL` 解决“怎么查库”
- `REST / GraphQL` 解决“客户端怎么向后端拿数据”
- `GraphQL` 比 REST 更强调“按需取字段”

---

## 3. GraphQL 是怎么通过 API 查到数据库的

这一段是核心。

GraphQL 看起来很像“直接查数据”，但中间其实还有一整层服务端执行过程。

完整流程通常是这样：

```text
1. 前端发 HTTP 请求到 GraphQL endpoint
2. GraphQL 服务端解析 query
3. 服务端根据 schema 校验这次查询是否合法
4. 服务端调用对应 resolver
5. resolver 去查数据库 / 调别的服务
6. GraphQL 把结果按 query 的形状组装成 JSON
7. 返回给前端
```

---

## 4. 这里的 schema、resolver、database 分别是什么

### schema：定义“能查什么”

GraphQL schema 就像后端公开出来的一份“查询合同”。

例如：

```graphql
type Message {
  id: ID!
  title: String!
  content: String!
  author: String!
}

type Query {
  messages: [Message!]!
}
```

这说明：

- 系统里有 `Message` 这种数据
- 可以查询 `messages`
- 每条消息里有哪些字段、字段类型是什么

如果前端去查一个 schema 里根本没有的字段，GraphQL 会直接报错。

### resolver：定义“具体怎么取”

resolver 是真正干活的函数。

比如伪代码：

```ts
const resolvers = {
  Query: {
    messages: async () => {
      return db.message.findMany({
        orderBy: { createdAt: "desc" },
      });
    },
  },
};
```

你可以把 resolver 理解成：

- GraphQL 世界里的“控制器 / service”
- 它收到查询请求后，决定怎么去查底层数据

### database：真正存数据的地方

底层不一定非得是 MySQL。

也可能是：

- PostgreSQL
- MongoDB
- Redis
- 另一个 REST API
- 区块链索引库
- Elasticsearch

GraphQL 只是把这些数据源统一包装成一个可查询的 API。

所以最重要的一句话是：

> GraphQL 不负责“存数据”，它负责“按 schema 和 query 的规则把数据取出来”。

---

## 5. 用一个传统后端例子理解

假设有一张数据库表 `messages`：

| id | title | content | author |
| --- | --- | --- | --- |
| 1 | hello | first post | alice |
| 2 | GraphQL | notes | bob |

前端发送 GraphQL：

```graphql
query {
  messages {
    id
    title
    author
  }
}
```

服务端大概会做这些事：

1. 解析出你在查 `messages`
2. 发现你只要 `id` `title` `author`
3. 调用 `messages` 对应的 resolver
4. resolver 去数据库查 `messages`
5. 把结果组装成只包含这 3 个字段的 JSON

这时真正查数据库的，依然是后端代码。

不是浏览器直接去执行：

```sql
SELECT id, title, author FROM messages;
```

而是类似这样：

```ts
async function messagesResolver() {
  return db.query("SELECT id, title, author FROM messages");
}
```

也就是说：

- 客户端写的是 GraphQL query
- 服务端内部可能转成 SQL
- 最终才从数据库里拿到数据

---

## 6. 放到你这个项目里，它是怎么工作的

你这个仓库不是“普通网站数据库”，而是“链上事件 + The Graph 索引 + GraphQL 查询”。

所以底层链路是：

```text
用户调用合约
-> 合约 emit 事件
-> The Graph 监听事件
-> mapping 把事件存成实体
-> The Graph 自动提供 GraphQL API
-> 前端 fetch 这个 GraphQL endpoint
```

这比普通后端多了一层“区块链索引”。

---

## 7. 先看数据从哪里来

你的合约在这里：

[MessageBoard.sol](/Volumes/HS-SSD-1TB/works/my-dapp-home-work-30/packages/contracts/contracts/MessageBoard.sol)

核心事件：

```solidity
event MessageWritten(
    address indexed author,
    string title,
    string content,
    uint256 createdAt
);
```

调用 `writeMessage(...)` 时，合约不会把消息写进 Solidity storage，而是直接：

```solidity
emit MessageWritten(msg.sender, title, content, block.timestamp);
```

这一步的意思是：

- 数据先出现在链上的 event log 里
- 还没有变成前端可以方便分页查询的“数据库记录”

---

## 8. The Graph 怎么把链上事件变成“可查询的数据”

### 第一步：定义要存成什么结构

你的 schema 在这里：

[schema.graphql](/Volumes/HS-SSD-1TB/works/my-dapp-home-work-30/packages/subgraph/schema.graphql)

```graphql
type Message @entity(immutable: true) {
  id: ID!
  author: Bytes!
  title: String!
  content: String!
  createdAt: BigInt!
  blockNumber: BigInt!
  blockTimestamp: BigInt!
  transactionHash: Bytes!
}
```

这可以先粗暴理解成一张“逻辑表”：

```ts
type Message = {
  id: string;
  author: string;
  title: string;
  content: string;
  createdAt: bigint;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: string;
};
```

注意这里的 `schema.graphql` 不是前端 query，而是在定义：

- 以后要存什么实体
- 每个实体有什么字段
- 最终能暴露出什么 GraphQL 查询能力

### 第二步：定义监听哪个合约事件

配置在这里：

[subgraph.yaml](/Volumes/HS-SSD-1TB/works/my-dapp-home-work-30/packages/subgraph/subgraph.yaml)

关键部分：

```yaml
eventHandlers:
  - event: MessageWritten(indexed address,string,string,uint256)
    handler: handleMessageWritten
```

意思是：

- 只要链上出现 `MessageWritten`
- 就执行 `handleMessageWritten`

### 第三步：mapping 把事件转成实体并保存

代码在这里：

[message-board.ts](/Volumes/HS-SSD-1TB/works/my-dapp-home-work-30/packages/subgraph/src/message-board.ts)

```ts
export function handleMessageWritten(event: MessageWrittenEvent): void {
  let entity = new Message(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  entity.author = event.params.author;
  entity.title = event.params.title;
  entity.content = event.params.content;
  entity.createdAt = event.params.createdAt;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
```

这段逻辑非常关键。

它本质上就在做：

```text
链上事件 -> 转成 Message 实体 -> 保存到 The Graph 的索引存储
```

这里的 `entity.save()`，你就可以把它理解成：

- 在普通后端里像 `db.insert(...)`
- 在 The Graph 里是“写入索引后的实体存储”

也就是说，到了这一步，数据已经不只是链上的原始日志了，而是被整理成一条条可查询记录。

---

## 9. The Graph 为什么能直接提供 GraphQL API

因为你定义了：

```graphql
type Message @entity { ... }
```

The Graph 会基于这个实体自动生成可查询入口。

所以前端可以直接查：

```graphql
query Messages($first: Int!) {
  messages(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
    id
    author
    title
    content
    createdAt
    blockNumber
    blockTimestamp
    transactionHash
  }
}
```

这背后不是“前端直接查区块链”。

真正发生的事情更接近：

```text
前端把 GraphQL query 发给 The Graph endpoint
-> The Graph 解析 query
-> 读取它已经索引好的 Message 实体存储
-> 把结果按 GraphQL 结构返回
```

所以在你这个项目里，GraphQL API 对接的“数据库”，更准确地说是：

- The Graph 为 subgraph 建立的索引存储
- 它本质上是一个可查询的数据层
- 前端不需要知道它底层具体怎么存

---

## 10. 你的前端是怎么发这个 GraphQL API 请求的

代码在这里：

[useMessageHistory.ts](/Volumes/HS-SSD-1TB/works/my-dapp-home-work-30/apps/web/src/app/eth-event-logs/useMessageHistory.ts)

你定义了 query：

```ts
const QUERY = `
  query Messages($first: Int!) {
    messages(first: $first, orderBy: blockTimestamp, orderDirection: desc) {
      id
      author
      title
      content
      createdAt
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;
```

然后通过 HTTP POST 发到 GraphQL endpoint：

```ts
const response = await fetch(MESSAGE_BOARD_GRAPH_ENDPOINT, {
  method: "POST",
  headers: {
    "content-type": "application/json",
  },
  body: JSON.stringify({
    query: QUERY,
    variables: {
      first: pageSize,
    },
  }),
});
```

这一段非常适合理解 GraphQL 的本质。

你不是在写：

```sql
SELECT * FROM messages LIMIT 20;
```

你是在发一个普通 HTTP 请求，只不过请求体里带的是 GraphQL query。

所以 GraphQL 在网络层上，很多时候其实和普通 API 很像：

- 一样走 HTTP
- 一样有 URL
- 一样返回 JSON

只是请求体里不是 REST 风格的参数，而是 `query + variables`。

---

## 11. 这次请求到了服务端以后，内部发生了什么

当你的前端请求到：

```text
https://api.studio.thegraph.com/query/.../message-board-sepolia-demo/...
```

大致会经过这些步骤：

1. The Graph endpoint 收到 HTTP POST
2. 解析请求体里的 GraphQL query
3. 校验 `messages` 字段是否存在于 schema
4. 校验 `id` `author` `title` 这些字段是否合法
5. 根据 `first`、`orderBy`、`orderDirection` 生成内部查询计划
6. 去读取已经被索引好的 `Message` 实体
7. 返回 JSON

你可以把它脑补成一个更通用的服务端过程：

```text
GraphQL query
-> GraphQL executor
-> resolver / store layer
-> database
-> JSON response
```

只不过在 The Graph 里，这一层很多能力是框架自动给你的。

你不需要自己手写 resolver，但本质思路没有变。

---

## 12. 返回结果为什么长这样

GraphQL 的返回结果几乎总是这个结构：

```json
{
  "data": {
    "messages": [
      {
        "id": "0xabc-0",
        "author": "0x123",
        "title": "hello",
        "content": "world"
      }
    ]
  }
}
```

如果出错，会有：

```json
{
  "errors": [
    {
      "message": "..."
    }
  ]
}
```

所以你在前端里才会这样写：

```ts
type GraphResponse = {
  data?: {
    messages?: MessageHistoryItem[];
  };
  errors?: Array<{ message: string }>;
};
```

这个结构正是 GraphQL 的典型响应格式。

---

## 13. 为什么不直接从链上查，而要经过 GraphQL

这是区块链项目里一个特别重要的问题。

因为链上原始数据虽然公开，但不适合前端直接做复杂列表查询。

直接读链上日志的问题通常有：

- 分页麻烦
- 排序麻烦
- 过滤麻烦
- 多字段组合查询麻烦
- 同步多个区块范围成本高
- 前端自己扫链会很重

The Graph 做的事情就是：

- 帮你持续监听链上事件
- 提前整理成结构化实体
- 暴露出适合前端使用的 GraphQL API

所以这里的角色分工是：

- 区块链负责“可信记录原始事件”
- The Graph 负责“把事件整理成可查询数据”
- GraphQL 负责“让前端方便拿这些数据”

---

## 14. 你可以怎么把它记住

如果你现在脑子里还有点绕，先只记这三句话。

### 记忆版 1

GraphQL 不是数据库，它是数据库前面的一层查询 API。

### 记忆版 2

前端发的是 GraphQL query，不是 SQL；真正查库的是服务端。

### 记忆版 3

在你这个项目里，GraphQL endpoint 查的不是 Solidity storage，而是 The Graph 索引后的 `Message` 实体。

---

## 15. 用你项目的真实链路做最终总结

把你这套代码压缩成一条线，就是：

```text
MessageBoard.writeMessage(...)
-> emit MessageWritten
-> subgraph.yaml 监听 MessageWritten
-> handleMessageWritten(event)
-> new Message(...).save()
-> The Graph 生成 messages GraphQL 查询入口
-> 前端 fetch(endpoint, { query, variables })
-> 返回历史消息列表
```

如果你用前端思维把它翻译一下，可以理解为：

```text
链上事件 = 原始数据来源
mapping = 后端入库逻辑
schema.graphql = 数据模型 + API 合同
GraphQL endpoint = 查询接口
useMessageHistory.ts = 前端调用接口的地方
```

---

## 16. 一个最容易踩的误区

很多初学者会以为：

> 我写了一段 GraphQL query，所以我是在“直接查数据库”。

更准确的说法应该是：

> 我在调用一个 GraphQL API；这个 API 再替我去查底层的数据源。

在普通项目里，底层数据源可能是 MySQL/Postgres。

在你这个项目里，底层数据源是 The Graph 已经索引好的实体存储。

---

## 17. 你下一步最值得继续看的文件

如果你想把这个理解再往前推进一层，推荐按这个顺序继续看：

1. [schema.graphql](/Volumes/HS-SSD-1TB/works/my-dapp-home-work-30/packages/subgraph/schema.graphql)
   先看“最终能查到的数据长什么样”
2. [message-board.ts](/Volumes/HS-SSD-1TB/works/my-dapp-home-work-30/packages/subgraph/src/message-board.ts)
   再看“链上事件是怎么被转成实体的”
3. [useMessageHistory.ts](/Volumes/HS-SSD-1TB/works/my-dapp-home-work-30/apps/web/src/app/eth-event-logs/useMessageHistory.ts)
   最后看“前端是怎么发 GraphQL 请求并拿到结果的”

如果你愿意，我下一步可以继续帮你补第二篇文档，专门讲：

- `schema.graphql` 为什么既像类型定义，又像数据库表设计
- `messages(...)` 这种查询为什么会自动出现
- 你的这段 GraphQL query 每个字段为什么都能被返回
