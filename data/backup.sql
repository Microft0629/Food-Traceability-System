-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: traceability
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `name` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `detail` text COLLATE utf8mb4_unicode_ci,
  `data_hash` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id_on_chain` bigint unsigned NOT NULL,
  `tx_hash` longtext COLLATE utf8mb4_unicode_ci,
  `producer_wallet` longtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (6,'2026-05-17 23:17:12.161','2026-05-17 23:17:12.161','有机番茄','产地：淮南','0x258490fff6c8d6fb2436a8a446d4aaf3ae5007804b7b1c271bfaacd9ca55a56a',1,'0xfa448dcd63b7e425bd1a7a2ab91ff5cf939b5e4da1c43b122d186d13221e6155','0x70997970c51812dc3a010c7d01b50e0d17dc79c8'),(7,'2026-05-17 23:21:49.688','2026-05-17 23:21:49.688','黄瓜','产地：合肥\n种植日期：2026.3.1','0x9bc7b231acd521bffefcd687b6d885a8c39f2d1efd79b98d8b5548aeb80b0af6',2,'0x220a3dce5f43ced74f1b53037c0fdfa3e33c3a1c2eb09a0ef7a521143539f5f9','0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc'),(8,'2026-05-17 23:28:32.117','2026-05-17 23:28:32.117','小番茄','产地：山东潍坊\n颜色：红色、黄色、绿色','0x1316afaa339ee12def1445817983660a6e9ae8e1ac890554225b46e797029a34',3,'0x08e5a6421cb9056f88c584f0b622aea792d3f9e02294a2122b7b0993691eb0c3','0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc'),(9,'2026-05-18 00:31:36.808','2026-05-18 00:32:03.079','小土豆','产地：山东潍坊\n种植时间：2026.3.15','0xe5b11f1c1cbc13aebf3d2a4d82d60394429068c1acada25a5925175b3e69c0ef',4,'0xbe29f1008ed340e54427bcf65620ea92c8cc486d147e55376859fc92f065b029','0x90f79bf6eb2c4f870365e785982e1f101e93b906'),(10,'2026-05-18 16:02:25.845','2026-05-18 16:03:19.375','火龙果','产地：新疆 颜色：红色','0x6bbe11cee3097c1685f8acb24f97a27e8c6dbf77bd2e85a45ef23ed634a2b79f',5,'0x2eae4160a64dce9066d4643c807b8ac4aacc23653345fb3f64b8de2883bfd365','0x70997970c51812dc3a010c7d01b50e0d17dc79c8');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-18 18:56:29
