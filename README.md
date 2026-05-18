### 食品溯源系统部署指南

#### 一、环境要求

在开始之前，请确保您的本地开发环境已安装以下软件：

- **Node.js** >= 18
- **npm** >= 9
- **Go** >= 1.21
- **MySQL** 8.0

#### 二、前置环境与克隆

首先，克隆项目仓库并进入项目目录。

```bash
git clone https://github.com/Microft0629/Food-Traceability-System.git
cd Food-Traceability-System
```

#### 三、安装依赖

根据项目结构，分别安装前端、区块链及后端所需的依赖库。

```bash
# 1. 前端依赖
cd frontend && npm install && cd ..

# 2. 区块链依赖
cd blockchain && npm install && cd ..

# 3. 后端依赖 (Go Modules)
cd backend && go mod tidy && cd ..
```

#### 四、配置数据库

请确保本地已安装 MySQL 服务。使用以下命令初始化数据库及用户权限（数据库名：`traceability`，密码：`126456`）。

```bash
cd data
# 创建数据库结构
mysql -u root -p < init_database.sql

# 导入初始数据
mysql -u traceadmin -p123456 traceability < backup.sql
```

#### 五、运行程序

请按顺序打开 **4个独立的终端窗口** 执行以下步骤：

**终端 1：启动 Ganache 区块链网络**

```bash
cd blockchain
npm run ganache
```

_操作提示：_

1.  保持该窗口开启，首次启动会自动创建 `ganache-data/` 目录。
2.  复制第一个账户的**私钥**，粘贴到项目根目录或后端目录下的 `.env` 文件指定位置并保存。

**终端 2：编译与部署智能合约**

```bash
cd blockchain
npx hardhat compile        # 编译合约
npm run deploy:ganache    # 部署合约到 Ganache
```

_操作提示：_

1.  部署成功后，会输出合约地址。
2.  **复制该合约地址**，分别粘贴到 `frontend/src/composables/useContract.js` 和 `backend/main.go` 的指定位置，确保前后端连接的是同一个合约实例。

**MetaMask 配置：**

1.  **添加网络**：RPC URL `http://127.0.0.1:8545`，链 ID `31337`。
2.  **导入账户**：
    - 管理员：私钥 `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
    - 生产商1：私钥 `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

**终端 3：启动后端服务**

```bash
cd backend
go run main.go
```

_预期输出：_ `Server running on :8080`。首次启动会自动检查并创建 MySQL 表结构。

**终端 4：启动前端服务**

```bash
cd frontend
npm run dev
```

_访问地址：_ 浏览器打开 。

#### 六、常见维护命令

**重启清理**
Ganache 异常退出后，必须清理锁文件才能重新启动：

```bash
taskkill /F /IM node.exe
rm -rf blockchain/ganache-data
npm run ganache
```

**数据库备份**
执行前请先进入项目目录，输入管理员密码：

```bash
mysqldump -u root -p traceability > backup.sql
```

**数据库查询**
用于检查数据写入状态：

```bash
mysql -u root -p
USE traceability;
SELECT * FROM products\G
```
