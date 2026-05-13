// 数据模型
package models

import "gorm.io/gorm"

type Product struct {
    gorm.Model
    BusinessNo       string `gorm:"unique;not null" json:"business_no"`
    Name             string `gorm:"not null" json:"name"`
    Detail           string `gorm:"type:text" json:"detail"`
    DataHash         string `gorm:"not null" json:"data_hash"`
    ProductIdOnChain uint   `gorm:"not null" json:"product_id_on_chain"` // 链上产品ID
    TxHash           string `json:"tx_hash"`                             // 上链交易哈希
    ProducerWallet   string `json:"producer_wallet"`
}