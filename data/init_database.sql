创建数据库（如果不存在），并指定编码
CREATE DATABASE IF NOT EXISTS traceability CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

创建用户（如果不存在）
CREATE USER IF NOT EXISTS 'traceadmin'@'localhost' IDENTIFIED BY '123456';

授予该用户对 traceability 数据库的所有权限
GRANT ALL PRIVILEGES ON traceability.* TO 'traceadmin'@'localhost';

刷新权限，让设置立即生效
FLUSH PRIVILEGES;