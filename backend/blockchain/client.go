// 区块链客户端初始化
package blockchain

import (
    "github.com/ethereum/go-ethereum/ethclient"
    "log"
)

var Client *ethclient.Client

func InitEthClient(rpcURL string) {
    var err error
    Client, err = ethclient.Dial(rpcURL)
    if err != nil {
        log.Fatal("Failed to connect to Ethereum node:", err)
    }
    log.Println("Connected to Ethereum node")
}