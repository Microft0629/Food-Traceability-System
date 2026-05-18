package models

import "time"

// Product 产品数据模型（MySQL 存储链下完整元数据）
type Product struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
	Name             string    `gorm:"not null" json:"name"`
	Detail           string    `gorm:"type:text" json:"detail"`
	DataHash         string    `gorm:"not null" json:"data_hash"`
	ProductIdOnChain uint      `gorm:"not null" json:"product_id_on_chain"`
	TxHash           string    `json:"tx_hash"`
	ProducerWallet   string    `json:"producer_wallet"`
}
