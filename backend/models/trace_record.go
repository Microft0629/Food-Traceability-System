package models

import "time"

// TraceRecord 溯源记录模型（MySQL 存储每条溯源环节的哈希，用于防篡改验证）
type TraceRecord struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	CreatedAt        time.Time `json:"created_at"`
	ProductIdOnChain uint      `gorm:"not null;index" json:"product_id_on_chain"`
	Description      string    `gorm:"type:text" json:"description"`
	DataHash         string    `gorm:"not null" json:"data_hash"`
	Operator         string    `json:"operator"`
	Timestamp        uint      `json:"timestamp"`
}
