// 食品溯源智能合约
// 管理员（owner）管理生产商白名单，生产商注册产品与添加溯源记录，任何人可查询

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/access/Ownable.sol";

contract FoodTrace is Ownable {
    // 1. 状态变量
    // 生产商地址白名单
    mapping(address => bool) public producers;

    // 溯源记录结构体
    struct TraceRecord {
        string data_hash;   // 环节数据的 SHA-256 哈希
        string description; // 环节描述（种植/加工/运输等）
        address operator;   // 操作者地址
        uint256 timestamp;  // 上链时间戳
    }

    // 产品结构体
    struct Product {
        uint256 id;                // 唯一产品 ID
        string name;               // 产品名称
        address producer;          // 创建该产品的生产商地址
        bool exists;               // 是否已注册
        TraceRecord[] records;     // 溯源记录数组
    }

    // 产品 ID 自增（起始为 1）
    uint256 public next_product_id = 1;

    // 产品映射
    mapping(uint256 => Product) public products;

    // 2. 事件
    // 事件：产品注册、记录添加、生产商添加/移除
    event ProductRegistered(uint256 indexed product_id, string name, address indexed producer);
    event RecordAdded(uint256 indexed product_id, string data_hash, string description, uint256 timestamp, address indexed operator);
    event ProducerAdded(address indexed producer);
    event ProducerRemoved(address indexed producer);

    // 3. 修饰符
    // 仅白名单内的生产商可调用
    modifier onlyProducer() {
        require(producers[msg.sender], "Caller is not a producer");
        _;
    }

    // 4. 构造函数
    // 部署者自动成为 owner（管理员）
    constructor() Ownable(msg.sender) {}

    // 5. 管理员函数（仅 owner）
    // 管理员添加生产商到白名单
    function add_producer(address _producer) external onlyOwner {
        require(_producer != address(0), "Invalid address");
        require(!producers[_producer], "Already a producer");
        producers[_producer] = true;
        emit ProducerAdded(_producer);
    }

    // 管理员从白名单移除生产商
    function remove_producer(address _producer) external onlyOwner {
        require(producers[_producer], "Not a producer");
        producers[_producer] = false;
        emit ProducerRemoved(_producer);
    }

    // 6. 生产商函数（仅白名单内生产商）
    // 注册新产品，自动创建第一条溯源记录，返回产品 ID
    function register_product(
        string calldata _name,
        string calldata _data_hash,
        string calldata _description
    ) external onlyProducer returns (uint256) {
        require(bytes(_name).length > 0, "Product name cannot be empty");

        // 防止注册同名产品
        for (uint256 i = 1; i < next_product_id; i++) {
            require(
                keccak256(bytes(products[i].name)) != keccak256(bytes(_name)),
                "Product name already exists"
            );
        }

        uint256 product_id = next_product_id;
        next_product_id++;

        Product storage p = products[product_id];
        p.id = product_id;
        p.name = _name;
        p.producer = msg.sender;
        p.exists = true;

        p.records.push(TraceRecord({
            data_hash: _data_hash,
            description: _description,
            operator: msg.sender,
            timestamp: block.timestamp
        }));

        emit ProductRegistered(product_id, _name, msg.sender);
        emit RecordAdded(product_id, _data_hash, _description, block.timestamp, msg.sender);
        return product_id;
    }

    // 为已有产品添加溯源记录（仅该产品的生产商）
    function add_record(
        uint256 _product_id,
        string calldata _data_hash,
        string calldata _description
    ) external onlyProducer {
        Product storage p = products[_product_id];
        require(p.exists, "Product does not exist");
        require(p.producer == msg.sender, "You are not the producer of this product");
        require(bytes(_data_hash).length > 0 || bytes(_description).length > 0, "Record must have at least hash or description");

        // 防止同一产品添加重复环节描述
        for (uint256 i = 0; i < p.records.length; i++) {
            require(
                keccak256(bytes(p.records[i].description)) != keccak256(bytes(_description)),
                "Duplicate record description"
            );
        }

        p.records.push(TraceRecord({
            data_hash: _data_hash,
            description: _description,
            operator: msg.sender,
            timestamp: block.timestamp
        }));

        emit RecordAdded(_product_id, _data_hash, _description, block.timestamp, msg.sender);
    }

    // 7. 公开查询函数（任何人可调用）
    // 查询产品完整信息（含全部溯源记录）
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

    // 获取当前已注册产品总数
    function get_product_count() external view returns (uint256) {
        return next_product_id - 1;
    }
}
