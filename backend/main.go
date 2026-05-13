package main

import (
	"backend/database"
	"backend/handlers"
	"backend/blockchain"
	"log"

	"github.com/gin-gonic/contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// ========== 1. 配置信息（你可以改为环境变量或配置文件） ==========
	// MySQL 连接字符串（请根据你的环境修改用户名、密码、数据库名）
	dsn := "traceadmin:123456@tcp(127.0.0.1:3306)/traceability?charset=utf8mb4&parseTime=True&loc=Local"

	// 以太坊节点 RPC 地址（本地 Ganache 默认 7545）
	ganacheRPC := "http://127.0.0.1:7545"

	// 合约 ABI 文件路径（相对于 backend 目录）
	abiPath := "abi/FoodTrace.json"

	// 已部署的合约地址（部署后替换）
	contractAddr := "0x3Ad438090D6CA3c26f2e4C4c2E7833066B87e709"
	// ========================================================

	// 初始化数据库
	database.InitDB(dsn)

	// 初始化以太坊客户端
	blockchain.InitEthClient(ganacheRPC)

	// 加载合约 ABI 并设置合约地址
	if err := blockchain.SetContract(abiPath, contractAddr); err != nil {
		log.Fatal("合约初始化失败:", err)
	}

	// 创建 Gin 引擎
	r := gin.Default()

	// 允许跨域（前端调用时避免跨域错误）
	r.Use(cors.Default())

	// 注册 API 路由
	api := r.Group("/api")
	{
		api.POST("/prepare-add", handlers.PrepareAdd)           // 预处理：计算哈希
		api.POST("/save-after-chain", handlers.SaveAfterChain)  // 上链后入库
		api.GET("/product/:business_no", handlers.GetProductByBN) // 查询产品详情
		api.GET("/verify/:business_no", handlers.VerifyProduct)   // 验证哈希真伪
	}

	// 启动服务（端口 8080）
	log.Println("Server running on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("启动服务失败:", err)
	}
}