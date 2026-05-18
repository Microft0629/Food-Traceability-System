// ethers.js 直接部署脚本：将 FoodTrace 合约部署到 Ganache (localhost:8545, chainId 31337)
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const rpcUrl = process.env.GANACHE_RPC_URL || "http://localhost:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl, 31337, { staticNetwork: true });

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("请在 .env 文件中设置 PRIVATE_KEY");
    process.exit(1);
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  console.log("部署账户:", wallet.address);

  // 读取编译产物 ABI 和 bytecode
  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "FoodTrace.sol", "FoodTrace.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\nFoodTrace 部署成功！");
  console.log("合约地址:", address);

  // 验证部署
  const code = await provider.getCode(address);
  console.log("链上代码长度:", code.length, "字节");
  console.log("链 ID:", 31337);

  // 同步 ABI 到前端和后端
  const abiJson = JSON.stringify(artifact.abi, null, 2);
  const frontendAbi = path.join(__dirname, "..", "..", "frontend", "src", "contractABI.json");
  const backendAbi = path.join(__dirname, "..", "..", "backend", "abi", "FoodTrace.json");
  fs.writeFileSync(frontendAbi, abiJson);
  fs.writeFileSync(backendAbi, abiJson);
  console.log("ABI 已同步到 frontend/src/ 和 backend/abi/");
  console.log("合约地址:", address, "← 确认与 frontend + backend 中地址一致");
}

main().catch((error) => {
  console.error("部署失败:", error);
  process.exit(1);
});
