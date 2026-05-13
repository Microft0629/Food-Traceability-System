// 处理函数（核心业务逻辑）
package handlers

import (
    "backend/database"
    "backend/models"
    "backend/blockchain" 
    "crypto/sha256"
    "encoding/hex"
    "net/http"

    "github.com/gin-gonic/gin"
)

// 1. 预处理：计算哈希并生成业务编号
func PrepareAdd(c *gin.Context) {
    var req struct {
        Name   string `json:"name" binding:"required"`
        Detail string `json:"detail" binding:"required"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // 哈希原文：name + detail
    hash := sha256.Sum256([]byte(req.Name + req.Detail))
    hashStr := hex.EncodeToString(hash[:])

    c.JSON(http.StatusOK, gin.H{
        "data_hash":   "0x" + hashStr,
        "business_no": "BN" + hashStr[:8],
    })
}

// 2. 上链后入库（前端需传入链上 product_id 和交易哈希）
func SaveAfterChain(c *gin.Context) {
    var p models.Product
    if err := c.ShouldBindJSON(&p); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误: " + err.Error()})
        return
    }
    if p.BusinessNo == "" || p.DataHash == "" || p.ProductIdOnChain == 0 {
        c.JSON(http.StatusBadRequest, gin.H{"error": "缺少必要字段: business_no, data_hash, product_id_on_chain"})
        return
    }

    if err := database.DB.Create(&p).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "入库失败: " + err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"status": "入库成功"})
}

// 3. 根据业务编号查询产品详情（链下）
func GetProductByBN(c *gin.Context) {
    bn := c.Param("business_no")
    var p models.Product
    if err := database.DB.Where("business_no = ?", bn).First(&p).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "产品不存在"})
        return
    }
    c.JSON(http.StatusOK, p)
}

// 4. 验证：对比数据库哈希与链上最新记录哈希
func VerifyProduct(c *gin.Context) {
    bn := c.Param("business_no")
    var p models.Product
    if err := database.DB.Where("business_no = ?", bn).First(&p).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "产品不存在"})
        return
    }

    // 从链上获取数据
    chainProduct, err := blockchain.GetProductFromChain(p.ProductIdOnChain)
    if err != nil {
	    c.JSON(http.StatusInternalServerError, gin.H{"error": "链上查询失败: " + err.Error()})
	    return
    }

    // 获取最后一条溯源记录的哈希
    if len(chainProduct.Records) == 0 {
        c.JSON(http.StatusOK, gin.H{"verified": false, "reason": "链上无溯源记录"})
        return
    }
    lastRecord := chainProduct.Records[len(chainProduct.Records)-1]
    chainHash := lastRecord.DataHash

    verified := (chainHash == p.DataHash)
    c.JSON(http.StatusOK, gin.H{
        "verified":   verified,
        "db_hash":    p.DataHash,
        "chain_hash": chainHash,
    })
}