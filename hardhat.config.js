require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.27",
  networks: {
    hardhat: {
      forking: {
        url: "https://mainnet.infura.io/v3/800c1e376fd048228f96dc28348f2870",
        blockNumber: 21000000
      }
    }
  }
};
