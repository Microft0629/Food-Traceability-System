// 主要业务逻辑
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

// 预处理：计算 SHA-256(name+detail)
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
	c.JSON(http.StatusOK, gin.H{"data_hash": "0x" + hex.EncodeToString(hash[:])})
}

// 上链后入库（产品 + 第一条溯源记录）
func SaveAfterChain(c *gin.Context) {
	var req struct {
		Name             string `json:"name"`
		Detail           string `json:"detail"`
		DataHash         string `json:"data_hash"`
		ProductIdOnChain uint   `json:"product_id_on_chain"`
		TxHash           string `json:"tx_hash"`
		ProducerWallet   string `json:"producer_wallet"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 存产品元数据
	p := models.Product{
		Name:             req.Name,
		Detail:           req.Detail,
		DataHash:         req.DataHash,
		ProductIdOnChain: req.ProductIdOnChain,
		TxHash:           req.TxHash,
		ProducerWallet:   req.ProducerWallet,
	}
	if err := database.DB.Create(&p).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "入库失败: " + err.Error()})
		return
	}

	// 存第一条溯源记录（注册时的初始记录）
	tr := models.TraceRecord{
		ProductIdOnChain: req.ProductIdOnChain,
		Description:      req.Detail,
		DataHash:         req.DataHash,
		Operator:         req.ProducerWallet,
		Timestamp:        uint(time.Now().Unix()),
	}
	database.DB.Create(&tr)

	c.JSON(http.StatusOK, gin.H{"status": "入库成功"})
}

// 按链上产品 ID 查询产品详情
func GetProductByID(c *gin.Context) {
	id := c.Param("id")
	var p models.Product
	if err := database.DB.Where("product_id_on_chain = ?", id).First(&p).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "产品不存在"})
		return
	}
	c.JSON(http.StatusOK, p)
}

// 添加溯源记录后存入 MySQL + 刷新产品更新时间
func UpdateProductTimestamp(c *gin.Context) {
	var req struct {
		ProductIdOnChain uint   `json:"product_id_on_chain" binding:"required"`
		Description      string `json:"description"`
		DataHash         string `json:"data_hash"`
		Operator         string `json:"operator"`
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

	// 存溯源记录（链下备份，供验证比对）
	tr := models.TraceRecord{
		ProductIdOnChain: req.ProductIdOnChain,
		Description:      req.Description,
		DataHash:         req.DataHash,
		Operator:         req.Operator,
		Timestamp:        uint(time.Now().Unix()),
	}
	database.DB.Create(&tr)

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// 防篡改验证：逐条比对链上所有溯源记录与 MySQL 中备份的哈希
func VerifyProduct(c *gin.Context) {
	id := c.Param("id")
	var p models.Product
	if err := database.DB.Where("product_id_on_chain = ?", id).First(&p).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "产品不存在"})
		return
	}

	chainProduct, err := blockchain.GetProductFromChain(p.ProductIdOnChain)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "链上查询失败: " + err.Error()})
		return
	}

	chainRecords := chainProduct.Records
	if len(chainRecords) == 0 {
		c.JSON(http.StatusOK, gin.H{"verified": false, "reason": "链上无溯源记录"})
		return
	}

	// 读取 MySQL 中的溯源记录
	var dbRecords []models.TraceRecord
	database.DB.Where("product_id_on_chain = ?", p.ProductIdOnChain).
		Order("id ASC").Find(&dbRecords)

	// 逐条比对
	type RecordResult struct {
		Index      int    `json:"index"`
		ChainHash  string `json:"chain_hash"`
		DbHash     string `json:"db_hash"`
		Match      bool   `json:"match"`
		Description string `json:"description"`
	}
	results := make([]RecordResult, 0, len(chainRecords))

	allMatch := true
	for i, cr := range chainRecords {
		rr := RecordResult{
			Index:       i + 1,
			ChainHash:   cr.DataHash,
			Description: cr.Description,
		}
		if i < len(dbRecords) {
			rr.DbHash = dbRecords[i].DataHash
			rr.Match = cr.DataHash == dbRecords[i].DataHash
		} else {
			rr.DbHash = "(无对应记录)"
			rr.Match = false
		}
		if !rr.Match {
			allMatch = false
		}
		results = append(results, rr)
	}

	c.JSON(http.StatusOK, gin.H{
		"verified": allMatch,
		"product_name": p.Name,
		"records":      results,
	})
}
