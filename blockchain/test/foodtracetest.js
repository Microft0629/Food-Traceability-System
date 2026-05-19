// 合约测试：FoodTrace.sol
// Ownable 权限：仅 owner 管理生产商，仅 producer 注册产品/添加记录，任何人可查询
import { describe, it } from "node:test";
import hre from "hardhat";
import { expect } from "chai";

describe("FoodTrace", function () {
  // ========== 测试基础设施 ==========

  async function getEthers() {
    const { ethers } = await hre.network.create();
    return ethers;
  }

  // 部署合约，返回四个测试账户 + 合约实例
  async function deploy() {
    const ethers = await getEthers();
    const [owner, producer, otherProducer, nonProducer] =
      await ethers.getSigners();
    const foodTrace = await ethers.deployContract("FoodTrace", []);
    return { foodTrace, owner, producer, otherProducer, nonProducer };
  }

  // 部署 + 将 producer 添加为生产商
  async function setupWithProducer() {
    const ctx = await deploy();
    await ctx.foodTrace.add_producer(ctx.producer.address);
    return ctx;
  }

  // 部署 + producer + otherProducer 均为生产商 + producer 已注册产品 #1
  async function setupWithProduct() {
    const ctx = await setupWithProducer();
    await ctx.foodTrace.add_producer(ctx.otherProducer.address);
    const c = ctx.foodTrace.connect(ctx.producer);
    await c.register_product("Organic Milk", "QmHash0", "Initial record");
    return ctx;
  }

  // ========== 1. 权限控制 ==========

  describe("Access Control", function () {
    it("should set deployer as owner", async function () {
      const { foodTrace, owner } = await deploy();
      const contractOwner = await foodTrace.owner();
      expect(contractOwner.toLowerCase()).to.equal(owner.address.toLowerCase());
    });

    it("should reject non-owner calling add_producer", async function () {
      const { foodTrace, producer } = await deploy();
      const c = foodTrace.connect(producer); // producer 不是 owner
      try {
        await c.add_producer(producer.address);
        expect.fail("Should have thrown");
      } catch (e) {
        // OpenZeppelin v5 Ownable 错误消息
        expect(e.message).to.include("OwnableUnauthorizedAccount");
      }
    });

    it("should reject non-owner calling remove_producer", async function () {
      const { foodTrace, producer } = await setupWithProducer();
      const c = foodTrace.connect(producer);
      try {
        await c.remove_producer(producer.address);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.message).to.include("OwnableUnauthorizedAccount");
      }
    });
  });

  // ========== 2. 生产商管理 ==========

  describe("Producer Management", function () {
    it("should allow owner to add a producer", async function () {
      const { foodTrace, producer } = await deploy();
      await foodTrace.add_producer(producer.address);
      expect(await foodTrace.producers(producer.address)).to.be.true;
    });

    it("should allow owner to remove a producer", async function () {
      const { foodTrace, producer } = await setupWithProducer();
      await foodTrace.remove_producer(producer.address);
      expect(await foodTrace.producers(producer.address)).to.be.false;
    });

    it("should reject adding already-existing producer", async function () {
      const { foodTrace, producer } = await setupWithProducer();
      try {
        await foodTrace.add_producer(producer.address);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.message).to.include("Already a producer");
      }
    });

    it("should reject adding zero address as producer", async function () {
      const { foodTrace } = await deploy();
      try {
        await foodTrace.add_producer(
          "0x0000000000000000000000000000000000000000",
        );
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.message).to.include("Invalid address");
      }
    });

    it("should reject removing a non-producer", async function () {
      const { foodTrace, nonProducer } = await deploy();
      try {
        await foodTrace.remove_producer(nonProducer.address);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.message).to.include("Not a producer");
      }
    });
  });

  // ========== 3. 产品注册 ==========

  describe("Product Registration", function () {
    it("should reject non-producer calling register_product", async function () {
      const { foodTrace, nonProducer } = await deploy();
      const c = foodTrace.connect(nonProducer);
      try {
        await c.register_product("Test", "hash0", "desc");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.message).to.include("Caller is not a producer");
      }
    });

    it("should increment product ID for each registration", async function () {
      const { foodTrace, producer } = await setupWithProducer();
      const c = foodTrace.connect(producer);

      await c.register_product("Product1", "hash1", "desc1");
      await c.register_product("Product2", "hash2", "desc2");
      await c.register_product("Product3", "hash3", "desc3");

      const p1 = await foodTrace.products(1);
      expect(p1[0]).to.equal(1n);
      expect(p1[1]).to.equal("Product1");
      expect(p1[3]).to.be.true;

      const p2 = await foodTrace.products(2);
      expect(p2[0]).to.equal(2n);
      expect(p2[1]).to.equal("Product2");

      const p3 = await foodTrace.products(3);
      expect(p3[0]).to.equal(3n);
      expect(p3[1]).to.equal("Product3");

      expect(await foodTrace.next_product_id()).to.equal(4n);
      expect(await foodTrace.get_product_count()).to.equal(3n);
    });

    it("should reject duplicate product name", async function () {
      const { foodTrace, producer } = await setupWithProducer();
      const c = foodTrace.connect(producer);
      await c.register_product("Apple", "hash1", "desc1");
      try {
        await c.register_product("Apple", "hash2", "desc2");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.message).to.include("Product name already exists");
      }
    });

    it("should reject empty product name", async function () {
      const { foodTrace, producer } = await setupWithProducer();
      const c = foodTrace.connect(producer);
      try {
        await c.register_product("", "", "");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.message).to.include("Product name cannot be empty");
      }
    });
  });

  // ========== 4. 溯源记录 ==========

  describe("Trace Records", function () {
    it("should allow producer to add record to own product", async function () {
      const { foodTrace, producer } = await setupWithProduct();
      const c = foodTrace.connect(producer);
      await c.add_record(1, "QmHash123", "Milk collected from farm");

      const product = await foodTrace.get_product(1);
      const records = product[4];
      expect(records).to.have.lengthOf(2);
      expect(records[1].data_hash).to.equal("QmHash123");
      expect(records[1].description).to.equal("Milk collected from farm");
      expect(records[1].operator.toLowerCase()).to.equal(
        producer.address.toLowerCase(),
      );
    });

    it("should reject adding record to other's product", async function () {
      const { foodTrace, otherProducer } = await setupWithProduct();
      const c = foodTrace.connect(otherProducer);
      try {
        await c.add_record(1, "QmHash456", "Other's product");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.message).to.include(
          "You are not the producer of this product",
        );
      }
    });

    it("should reject add_record for non-existent product", async function () {
      const { foodTrace, producer } = await setupWithProducer();
      const c = foodTrace.connect(producer);
      try {
        await c.add_record(999, "QmHash", "No product");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.message).to.include("Product does not exist");
      }
    });

    it("should reject duplicate record description", async function () {
      const { foodTrace, producer } = await setupWithProduct();
      const c = foodTrace.connect(producer);
      await c.add_record(1, "QmHash001", "Farm collection");
      try {
        await c.add_record(1, "QmHash002", "Farm collection");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.message).to.include("Duplicate record description");
      }
    });

    it("should reject add_record from non-producer", async function () {
      const { foodTrace, nonProducer } = await setupWithProduct();
      const c = foodTrace.connect(nonProducer);
      try {
        await c.add_record(1, "QmHash", "Test");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.message).to.include("Caller is not a producer");
      }
    });
  });

  // ========== 5. 产品查询（任何人可调用） ==========

  describe("Product Query", function () {
    it("should allow anyone to query product", async function () {
      const { foodTrace, producer, nonProducer } = await setupWithProducer();
      const c = foodTrace.connect(producer);
      await c.register_product("Organic Milk", "QmHash0", "Initial record");
      await c.add_record(1, "QmHash001", "Farm collection");

      // nonProducer（非生产商）也能查询
      const product = await foodTrace.get_product(1);
      expect(product[0]).to.equal(1n);
      expect(product[1]).to.equal("Organic Milk");
      const records = product[4];
      expect(records).to.have.lengthOf(2);
    });

    it("should return product info with all records", async function () {
      const { foodTrace, producer } = await setupWithProducer();
      const c = foodTrace.connect(producer);
      await c.register_product("Organic Milk", "QmHash0", "Initial record");
      await c.add_record(1, "QmHash001", "Farm collection");
      await c.add_record(1, "QmHash002", "Factory processing");
      await c.add_record(1, "QmHash003", "Warehouse storage");

      const product = await foodTrace.get_product(1);
      expect(product[0]).to.equal(1n);
      expect(product[1]).to.equal("Organic Milk");
      expect(product[2].toLowerCase()).to.equal(producer.address.toLowerCase());
      expect(product[3]).to.be.true;
      const records = product[4];
      expect(records).to.have.lengthOf(4);
      expect(records[2].description).to.equal("Factory processing");
    });

    it("should revert when querying non-existent product", async function () {
      const { foodTrace } = await deploy();
      try {
        await foodTrace.get_product(999);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.message).to.include("Product does not exist");
      }
    });
  });
});
