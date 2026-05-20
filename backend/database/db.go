// MySQL 数据库连接与迁移
package database

import (
	"backend/models"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"log"
)

var DB *gorm.DB

func InitDB(dsn string) {
	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to MySQL:", err)
	}
	// 自动建表
	err = DB.AutoMigrate(&models.Product{}, &models.TraceRecord{})
	if err != nil {
		log.Fatal("Failed to migrate tables:", err)
	}
	log.Println("Database connected and migrated")
}
