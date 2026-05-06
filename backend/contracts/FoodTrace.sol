// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract FoodTrace is Ownable {
    // 生产商地址映射（管理员可管理）
    mapping(address => bool) public producers;

    // 溯源记录结构体
    struct TraceRecord {
        string data_hash;      // 链下数据哈希
        string description;    // 环节描述
        address operator;      // 操作者地址
        uint256 timestamp;     // 上链时间戳
    }

    // 产品结构体
    struct Product {
        uint256 id;                   // 唯一产品ID
        string name;                  // 产品名称
        address producer;             // 生产商地址
        bool exists;                  // 是否已注册
        TraceRecord[] records;        // 溯源记录数组
    }

    // 产品ID自增
    uint256 public next_product_id = 1;

    // 产品ID到产品的映射
    mapping(uint256 => Product) public products;

    // 事件
    event ProductRegistered(uint256 indexed product_id, string name, address indexed producer);
    event RecordAdded(uint256 indexed product_id, string data_hash, string description, uint256 timestamp, address indexed operator);
    event ProducerAdded(address indexed producer);
    event ProducerRemoved(address indexed producer);

    // 构造函数，设置管理员（部署者即owner）
    constructor() Ownable(msg.sender) {}

    // 修饰符：仅生产商
    modifier onlyProducer() {
        require(producers[msg.sender], "Caller is not a producer");
        _;
    }

    // 管理员添加生产商
    function add_producer(address _producer) external onlyOwner {
        require(_producer != address(0), "Invalid address");
        require(!producers[_producer], "Already a producer");
        producers[_producer] = true;
        emit ProducerAdded(_producer);
    }

    // 管理员移除生产商
    function remove_producer(address _producer) external onlyOwner {
        require(producers[_producer], "Not a producer");
        producers[_producer] = false;
        emit ProducerRemoved(_producer);
    }

    // 生产商注册新产品，返回产品ID
    function register_product(string calldata _name) external onlyProducer returns (uint256) {
        require(bytes(_name).length > 0, "Product name cannot be empty");

        uint256 product_id = next_product_id;
        next_product_id++;

        Product storage p = products[product_id];
        p.id = product_id;
        p.name = _name;
        p.producer = msg.sender;
        p.exists = true;

        emit ProductRegistered(product_id, _name, msg.sender);
        return product_id;
    }

    // 生产商为指定产品添加溯源记录
    function add_record(
        uint256 _product_id,
        string calldata _data_hash,
        string calldata _description
    ) external onlyProducer {
        Product storage p = products[_product_id];
        require(p.exists, "Product does not exist");
        require(p.producer == msg.sender, "You are not the producer of this product");
        require(bytes(_data_hash).length > 0 || bytes(_description).length > 0, "Record must have at least hash or description");

        p.records.push(TraceRecord({
            data_hash: _data_hash,
            description: _description,
            operator: msg.sender,
            timestamp: block.timestamp
        }));

        emit RecordAdded(_product_id, _data_hash, _description, block.timestamp, msg.sender);
    }

    // 查询产品信息（包括所有溯源记录）
    function get_product(uint256 _product_id) external view returns (
        uint256 id,
        string memory name,
        address producer,
        bool exists,
        TraceRecord[] memory records
    ) {
        Product storage p = products[_product_id];
        require(p.exists, "Product does not exist");
        return (p.id, p.name, p.producer, p.exists, p.records);
    }
}