import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";

const PRIVATE_KEY =
  "0xd6acbbd8fbd8dc12f10d6ecad174065e0c1ec92501afaa9066493ef328274f3a";

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
      accounts: [PRIVATE_KEY],
    },
  },
};
