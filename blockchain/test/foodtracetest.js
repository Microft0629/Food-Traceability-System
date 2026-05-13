import { describe, it } from "node:test";
import hre from "hardhat";
import { expect } from "chai";

describe("FoodTrace", function () {
  async function getViem() {
    const { viem } = await hre.network.create();
    return viem;
  }

  async function deploy() {
    const viem = await getViem();
    const [owner, producer, otherProducer, nonProducer] =
      await viem.getWalletClients();
    const foodTrace = await viem.deployContract("FoodTrace", []);
    return { viem, foodTrace, owner, producer, otherProducer, nonProducer };
  }

  async function setupWithProducer() {
    const ctx = await deploy();
    await ctx.foodTrace.write.add_producer([ctx.producer.account.address]);
    return ctx;
  }

  describe("Deployment", function () {
    it("should set the deployer as owner", async function () {
      const { foodTrace, owner } = await deploy();
      const contractOwner = await foodTrace.read.owner();
      // viem returns checksummed address, normalize to lowercase
      expect(contractOwner.toLowerCase()).to.equal(
        owner.account.address.toLowerCase()
      );
    });
  });

  describe("Producer Management", function () {
    it("should allow owner to add a producer", async function () {
      const { foodTrace, producer } = await deploy();
      await foodTrace.write.add_producer([producer.account.address]);
      expect(
        await foodTrace.read.producers([producer.account.address])
      ).to.be.true;
    });

    it("should allow owner to remove a producer", async function () {
      const { foodTrace, producer } = await setupWithProducer();
      await foodTrace.write.remove_producer([producer.account.address]);
      expect(
        await foodTrace.read.producers([producer.account.address])
      ).to.be.false;
    });

    it("should reject adding zero address as producer", async function () {
      const { foodTrace } = await deploy();
      try {
        await foodTrace.write.add_producer([
          "0x0000000000000000000000000000000000000000",
        ]);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.message).to.include("Invalid address");
      }
    });

    it("should reject removing a non-producer", async function () {
      const { foodTrace, nonProducer } = await deploy();
      try {
        await foodTrace.write.remove_producer([nonProducer.account.address]);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.message).to.include("Not a producer");
      }
    });
  });

  describe("Product Registration", function () {
    it("should reject non-producer calling register_product", async function () {
      const { viem, foodTrace, nonProducer } = await setupWithProducer();
      const c = await viem.getContractAt("FoodTrace", foodTrace.address, {
        client: { wallet: nonProducer },
      });
      try {
        await c.write.register_product(["TestProduct"]);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.message).to.include("Caller is not a producer");
      }
    });

    it("should increment product ID for each registration", async function () {
      const { viem, foodTrace, producer } = await setupWithProducer();
      const c = await viem.getContractAt("FoodTrace", foodTrace.address, {
        client: { wallet: producer },
      });

      await c.write.register_product(["Product1"]);
      await c.write.register_product(["Product2"]);
      await c.write.register_product(["Product3"]);

      // products() returns [id, name, producer, exists] as array
      const p1 = await foodTrace.read.products([1n]);
      expect(p1[0]).to.equal(1n);
      expect(p1[1]).to.equal("Product1");
      expect(p1[3]).to.be.true;

      const p2 = await foodTrace.read.products([2n]);
      expect(p2[0]).to.equal(2n);
      expect(p2[1]).to.equal("Product2");

      const p3 = await foodTrace.read.products([3n]);
      expect(p3[0]).to.equal(3n);
      expect(p3[1]).to.equal("Product3");

      expect(await foodTrace.read.next_product_id()).to.equal(4n);
    });

    it("should reject empty product name", async function () {
      const { viem, foodTrace, producer } = await setupWithProducer();
      const c = await viem.getContractAt("FoodTrace", foodTrace.address, {
        client: { wallet: producer },
      });
      try {
        await c.write.register_product([""]);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.message).to.include("Product name cannot be empty");
      }
    });
  });

  describe("Trace Records", function () {
    async function setupWithProduct() {
      const ctx = await setupWithProducer();
      await ctx.foodTrace.write.add_producer([
        ctx.otherProducer.account.address,
      ]);
      const c = await ctx.viem.getContractAt(
        "FoodTrace",
        ctx.foodTrace.address,
        { client: { wallet: ctx.producer } }
      );
      await c.write.register_product(["Organic Milk"]);
      return ctx;
    }

    it("should allow producer to add record to own product", async function () {
      const { viem, foodTrace, producer } = await setupWithProduct();
      const c = await viem.getContractAt("FoodTrace", foodTrace.address, {
        client: { wallet: producer },
      });

      await c.write.add_record([1n, "QmHash123", "Milk collected from farm"]);

      // get_product returns [id, name, producer, exists, records[]] as array
      const product = await foodTrace.read.get_product([1n]);
      const records = product[4];
      expect(records).to.have.lengthOf(1);
      expect(records[0].data_hash).to.equal("QmHash123");
      expect(records[0].description).to.equal("Milk collected from farm");
      expect(records[0].operator.toLowerCase()).to.equal(
        producer.account.address.toLowerCase()
      );
    });

    it("should reject adding record to other's product", async function () {
      const { viem, foodTrace, otherProducer } = await setupWithProduct();
      const c = await viem.getContractAt("FoodTrace", foodTrace.address, {
        client: { wallet: otherProducer },
      });

      try {
        await c.write.add_record([1n, "QmHash456", "Other's product"]);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.message).to.include(
          "You are not the producer of this product"
        );
      }
    });

    it("should reject add_record for non-existent product", async function () {
      const { viem, foodTrace, producer } = await setupWithProducer();
      const c = await viem.getContractAt("FoodTrace", foodTrace.address, {
        client: { wallet: producer },
      });
      try {
        await c.write.add_record([999n, "QmHash", "No product"]);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.message).to.include("Product does not exist");
      }
    });

    it("should reject add_record from non-producer", async function () {
      const { viem, foodTrace, nonProducer } = await setupWithProduct();
      const c = await viem.getContractAt("FoodTrace", foodTrace.address, {
        client: { wallet: nonProducer },
      });
      try {
        await c.write.add_record([1n, "QmHash", "Test"]);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.message).to.include("Caller is not a producer");
      }
    });
  });

  describe("Product Query", function () {
    it("should return product info with all records", async function () {
      const { viem, foodTrace, producer } = await setupWithProducer();
      const c = await viem.getContractAt("FoodTrace", foodTrace.address, {
        client: { wallet: producer },
      });

      await c.write.register_product(["Organic Milk"]);
      await c.write.add_record([1n, "QmHash001", "Farm collection"]);
      await c.write.add_record([1n, "QmHash002", "Factory processing"]);
      await c.write.add_record([1n, "QmHash003", "Warehouse storage"]);

      // get_product returns [id, name, producer, exists, records[]]
      const product = await foodTrace.read.get_product([1n]);
      expect(product[0]).to.equal(1n);
      expect(product[1]).to.equal("Organic Milk");
      expect(product[2].toLowerCase()).to.equal(
        producer.account.address.toLowerCase()
      );
      expect(product[3]).to.be.true;
      const records = product[4];
      expect(records).to.have.lengthOf(3);
      expect(records[1].description).to.equal("Factory processing");
    });

    it("should revert when querying non-existent product", async function () {
      const { foodTrace } = await deploy();
      try {
        await foodTrace.read.get_product([999n]);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.message).to.include("Product does not exist");
      }
    });
  });
});
