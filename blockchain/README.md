# Food Traceability System - 后端

基于 Solidity + Hardhat 的食品溯源智能合约，支持生产者管理、产品注册和溯源记录上链。

## 环境要求

- Node.js >= 18
- npm >= 9

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/Microft0629/Food-Traceability-System.git
cd Food-Traceability-System/backend
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env，填入私钥（见下一步）
```

### 4. 启动本地链（Ganache）

```bash
npm run ganache
```

启动后会输出 10 个账户及其私钥：

```
Available Accounts
==================
(0) 0xa1eF58670368eCCB27EdC6609dea0fEFC5884f09 (1000 ETH)
...

Private Keys
==================
(0) 0x5b3208286264f409e1873e3709d3138acf47f6cc733e74a6b47a040b50472fd8
...
```

将账户 #0 的私钥复制到 `.env` 文件中：

```
PRIVATE_KEY=0x5b3208286264f409e1873e3709d3138acf47f6cc733e74a6b47a040b50472fd8
```

> **注意**：Ganache 使用固定 seed `myCustomSeed`，每次启动生成的账户和私钥完全一致。如果你修改了 seed，需要用新的私钥。

### 5. 部署合约

```bash
npm run deploy:ganache
```

部署成功后输出合约地址：

```
FoodTrace#FoodTrace - 0x3Ad438090D6CA3c26f2e4C4c2E7833066B87e709
```

### 6. 运行测试

```bash
npm test
```

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run ganache` | 启动本地 Ganache 链（端口 7545） |
| `npm run compile` | 编译 Solidity 合约 |
| `npm run deploy:ganache` | 部署合约到 Ganache |
| `npm test` | 运行测试用例 |
| `npm run node` | 启动 Hardhat 内置节点 |

## 合约功能

- **生产者管理**：合约 Owner 可添加/移除生产者
- **产品注册**：生产者可注册新产品
- **溯源记录**：生产者为自己的产品添加溯源记录（IPFS 哈希 + 描述）
- **产品查询**：查询产品完整信息和所有溯源记录

## 项目结构

```
backend/
├── contracts/          # Solidity 合约
├── ignition/
│   ├── modules/        # 部署模块
│   └── deployments/    # 部署记录
├── test/               # 测试用例
├── .env.example        # 环境变量模板
├── hardhat.config.js   # Hardhat 配置
└── package.json
```
