// Hardhat 配置文件：Solidity 编译器 + 网络 + ethers.js / test-runner 插件
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatTestRunner from "@nomicfoundation/hardhat-node-test-runner";
import dotenv from "dotenv";

dotenv.config();

const networks = {
  ganache: {
    type: "http",
    url: process.env.GANACHE_RPC_URL || "http://127.0.0.1:8545",
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
  },
};

export default {
  plugins: [hardhatEthers, hardhatTestRunner],
  solidity: {
    version: "0.8.20",
    settings: {
      evmVersion: "paris",
    },
  },
  networks,
};
