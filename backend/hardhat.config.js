import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";

require("dotenv").config();

export default {
  plugins: [hardhatToolboxViem],
  solidity: {
    version: "0.8.20",
    settings: {
      evmVersion: "paris",
    },
  },
  networks: {
    ganache: {
      type: "http",
      url: "http://127.0.0.1:7545",
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
