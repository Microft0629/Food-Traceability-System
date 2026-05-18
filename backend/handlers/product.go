package handlers

import (
	"backend/blockchain"
	"backend/database"
	"backend/models"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// 1. 预处理：计算产品数据的 SHA-256 哈希
func PrepareAdd(c *gin.Context) {
	var req struct {
		Name   string `json:"name" binding:"required"`
		Detail string `json:"detail" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hash := sha256.Sum256([]byte(req.Name + req.Detail))
	hashStr := "0x" + hex.EncodeToString(hash[:])

	c.JSON(http.StatusOK, gin.H{"data_hash": hashStr})
}

// 2. 上链后入库
func SaveAfterChain(c *gin.Context) {
	var p models.Product
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
		return
	}
	if p.Name == "" || p.DataHash == "" || p.ProductIdOnChain == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少必要字段: name, data_hash, product_id_on_chain"})
		return
	}

	if err := database.DB.Create(&p).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "入库失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "入库成功"})
}

// 3. 根据数据库主键 ID 查询产品详情
func GetProductByID(c *gin.Context) {
	id := c.Param("id")
	var p models.Product
	if err := database.DB.First(&p, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "产品不存在"})
		return
	}
	c.JSON(http.StatusOK, p)
}

// 4. 验证：对比数据库哈希与链上最新记录哈希
func VerifyProduct(c *gin.Context) {
	id := c.Param("id")
	var p models.Product
	if err := database.DB.First(&p, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "产品不存在"})
		return
	}

	chainProduct, err := blockchain.GetProductFromChain(p.ProductIdOnChain)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "链上查询失败: " + err.Error()})
		return
	}

	if len(chainProduct.Records) == 0 {
		c.JSON(http.StatusOK, gin.H{"verified": false, "reason": "链上无溯源记录"})
		return
	}
	lastRecord := chainProduct.Records[len(chainProduct.Records)-1]

	verified := (lastRecord.DataHash == p.DataHash)
	c.JSON(http.StatusOK, gin.H{
		"verified":   verified,
		"db_hash":    p.DataHash,
		"chain_hash": lastRecord.DataHash,
	})
}

// 5. 添加溯源记录后刷新产品的更新时间
func UpdateProductTimestamp(c *gin.Context) {
	var req struct {
		ProductIdOnChain uint `json:"product_id_on_chain" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var p models.Product
	if err := database.DB.Where("product_id_on_chain = ?", req.ProductIdOnChain).First(&p).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "产品不存在"})
		return
	}

	database.DB.Model(&p).Update("updated_at", time.Now())
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
