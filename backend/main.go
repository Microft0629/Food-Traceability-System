package main

import (
	"backend/blockchain"
	"backend/database"
	"backend/handlers"
	"log"

	"github.com/gin-gonic/gin"
)

// CORS 中间件：处理所有跨域请求（含 OPTIONS 预检）
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Requested-With")
		c.Header("Access-Control-Expose-Headers", "Content-Length, Content-Type")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400")

		// OPTIONS 预检请求直接返回 204，不进入后续路由
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func main() {
	// ========== 1. 配置信息 ==========
	dsn := "traceadmin:123456@tcp(127.0.0.1:3306)/traceability?charset=utf8mb4&parseTime=True&loc=Local"

	// 以太坊节点 RPC 地址
	ganacheRPC := "http://127.0.0.1:8545"

	// 合约 ABI 文件路径
	abiPath := "abi/FoodTrace.json"

	// 已部署的合约地址
	contractAddr := "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"

	// ========== 2. 初始化 ==========
	database.InitDB(dsn)
	blockchain.InitEthClient(ganacheRPC)
	if err := blockchain.SetContract(abiPath, contractAddr); err != nil {
		log.Fatal("合约初始化失败:", err)
	}

	// ========== 3. 创建 Gin 引擎并注册中间件 ==========
	r := gin.Default()
	r.Use(CORSMiddleware()) // 自定义 CORS，直接处理 OPTIONS 预检

	// ========== 4. 注册 API 路由 ==========
	api := r.Group("/api")
	{
		api.POST("/prepare-add", handlers.PrepareAdd)             // 预处理：计算 SHA-256 哈希
		api.POST("/save-after-chain", handlers.SaveAfterChain)    // 上链后入库
		api.POST("/update-product", handlers.UpdateProductTimestamp) // 溯源记录后刷新时间
		api.GET("/product/:id", handlers.GetProductByID)             // 查询产品详情
		api.GET("/verify/:id", handlers.VerifyProduct)              // 验证链上链下哈希一致性
	}

	// ========== 5. 启动服务 ==========
	log.Println("Server running on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("启动服务失败:", err)
	}
}
