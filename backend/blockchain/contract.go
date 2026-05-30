package blockchain

import (
	"context"
	"fmt"
	"math/big"
	"os"
	"strings"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
)

var (
	parsedABI    abi.ABI
	contractAddr common.Address
)

// SetContract 从 ABI 文件路径加载 ABI，并设置合约地址
func SetContract(abiFilePath, addrHex string) error {
	// 读取 ABI 文件
	data, err := os.ReadFile(abiFilePath)
	if err != nil {
		return fmt.Errorf("读取 ABI 文件失败: %w", err)
	}

	// 解析 ABI
	parsedABI, err = abi.JSON(strings.NewReader(string(data)))
	if err != nil {
		return fmt.Errorf("解析 ABI 失败: %w", err)
	}

	// 设置合约地址
	if !common.IsHexAddress(addrHex) {
		return fmt.Errorf("无效的合约地址: %s", addrHex)
	}
	contractAddr = common.HexToAddress(addrHex)
	return nil
}

// ChainProduct 链上返回的产品结构体（与合约 get_product 返回匹配）
type ChainProduct struct {
	Id       *big.Int
	Name     string
	Producer common.Address
	Exists   bool
	Records  []ChainRecord
}

// ChainRecord 溯源记录
type ChainRecord struct {
	DataHash    string
	Description string
	Operator    common.Address
	Timestamp   *big.Int
}

// GetProductFromChain 调用合约 get_product，返回链上产品信息
func GetProductFromChain(productID uint) (*ChainProduct, error) {
	// 打包调用数据
	callData, err := parsedABI.Pack("get_product", big.NewInt(int64(productID)))
	if err != nil {
		return nil, fmt.Errorf("打包调用数据失败: %w", err)
	}

	// 调用合约
	result, err := Client.CallContract(context.Background(), ethereum.CallMsg{
		To:   &contractAddr,
		Data: callData,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("合约调用失败: %w", err)
	}

	// 解析返回结果
	// Unpack 需要知道返回类型，get_product 返回 (uint256,string,address,bool,(string,string,address,uint256)[])
	// 定义临时结构体用于解析，也可以使用 UnpackIntoInterface
	var res struct {
		Id       *big.Int
		Name     string
		Producer common.Address
		Exists   bool
		Records  []struct {
			DataHash    string `json:"data_hash"`
			Description string `json:"description"`
			Operator    common.Address
			Timestamp   *big.Int
		}
	}
	err = parsedABI.UnpackIntoInterface(&res, "get_product", result)
	if err != nil {
		return nil, fmt.Errorf("解析返回数据失败: %w", err)
	}

	// 转换为导出类型
	chainProduct := &ChainProduct{
		Id:       res.Id,
		Name:     res.Name,
		Producer: res.Producer,
		Exists:   res.Exists,
		Records:  make([]ChainRecord, len(res.Records)),
	}
	for i, r := range res.Records {
		chainProduct.Records[i] = ChainRecord{
			DataHash:    r.DataHash,
			Description: r.Description,
			Operator:    r.Operator,
			Timestamp:   r.Timestamp,
		}
	}
	return chainProduct, nil
}