const {
  impersonateAccount
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const {
  KernelABI,
  DonutABI,
  AppProxyUpgradeableABI
} = require("../ABI.json")
const { abi: TokenManagerABI } = require("../artifacts/contracts/TokenManager.sol/TokenManager.json")
const { id, parseEther } = require("ethers")

const multisigAddress = "0x367b68554f9CE16A87fD0B6cE4E70d465A0C940E";
const vitalikAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const carlAddress = "0x95D9bED31423eb7d5B68511E0352Eae39a3CDD20";
const donutAddress = "0xC0F9bD5Fa5698B6505F643900FFA515Ea5dF54A9";
const donutDeployerAddress = "0x459f5ad95D9faD4034c5623D5FaA59E456d1c4ed";
const kernelAddress = "0x57EBE61f5f8303AD944136b293C1836B3803b4c0";
const tokenManagerProxyAddress = "0x3D361F670C3099627e7e9Ae9c3d6644B0DDF8f69";
const baseNamespace = id("base");
const tokenManagerAppId = "0x6b20a3010614eeebf2138ccec99f028a61c811b3b1a3343b6ff635985c75c91f";//id("token-manager.aragonpm.eth");

const ANNUAL_MINT_AMOUNT = "20880000";

describe("TokenManager", function () {
  async function setup() {
    await impersonateAccount(vitalikAddress);
    await impersonateAccount(carlAddress);
    await impersonateAccount(donutDeployerAddress);
    await impersonateAccount(multisigAddress);

    const vitalik = await ethers.getSigner(vitalikAddress);
    const carl = await ethers.getSigner(carlAddress);
    const signer = await ethers.getSigner(donutDeployerAddress);
    const multisig = await ethers.getSigner(multisigAddress);
    await vitalik.sendTransaction({to: donutDeployerAddress, value: parseEther("1.0")});
    await vitalik.sendTransaction({to: multisigAddress, value: parseEther("1.0")});
    await vitalik.sendTransaction({to: carlAddress, value: parseEther("1.0")});

    const TokenManager = await ethers.getContractFactory("TokenManager");
    const tokenManager = await TokenManager.deploy();

    const kernel = await ethers.getContractAt(KernelABI, kernelAddress, signer);
    const donut = await ethers.getContractAt(DonutABI, donutAddress, signer);

    return { signer, TokenManager, tokenManager, kernel, vitalik, multisig, donut, carl }
  }

  async function finalState() {
    const {tokenManager, kernel, vitalik, multisig, donut, carl} = await setup();
    await kernel.setApp(baseNamespace, tokenManagerAppId, tokenManager.target);
    // // change donut controller from the Aragon proxy contract to direct Token Manager contract
    const tokenManagerProxy = await ethers.getContractAt(TokenManagerABI, tokenManagerProxyAddress, multisig);
    await tokenManagerProxy.changeDonutController(tokenManager.target);
    return {tokenManager, donut, vitalik, carl, multisig}
  }

  describe("Upgrade token manager app", function (){

    it("Should upgrade to new implementation", async function () {
      const {signer, tokenManager, kernel} = await setup();
      await kernel.setApp(baseNamespace, tokenManagerAppId, tokenManager.target);
      const newAppAddress = await kernel.getApp(baseNamespace, tokenManagerAppId);
      
      expect(newAppAddress).to.equal(tokenManager.target);
    });

    it("Should fail upgrade from non auth account (Vitalik)", async function () {
      const {signer, tokenManager, kernel, vitalik} = await setup();
      const kernelAsVitalik = kernel.connect(vitalik);

      await expect(kernelAsVitalik.setApp(baseNamespace, tokenManagerAppId, tokenManager.target)).to.be.revertedWith("KERNEL_AUTH_FAILED");
    });

  })

  describe("Change Controller", function (){

    let tokenManager, donut, vitalik, carl, multisig

    before( async () => {
      ({tokenManager, donut, vitalik, carl, multisig} = await finalState());
    })

    it("Should change donut controller", async function () {
      const donutController = await donut.controller();

      expect(donutController).to.equal(tokenManager.target);
    });

    it("Should allow donut approvals", async function(){
      // carl approve vitalik to spend 1000 of his donuts
      const AMOUNT = parseEther("1000")
      await donut.connect(carl).approve(vitalikAddress, AMOUNT);

      expect(await donut.allowance(carlAddress, vitalikAddress)).to.equal(AMOUNT);
    });

    it("Should allow donut transfers", async function(){
      // carl send vitalik 1000 donuts
      const AMOUNT = parseEther("1000")
      const vitalikBalance = await donut.balanceOf(vitalikAddress)
      await donut.connect(carl).transfer(vitalikAddress, AMOUNT);

      expect(await donut.balanceOf(vitalikAddress)).to.equal(AMOUNT + vitalikBalance);
    });

    it("Should disallow mint donut batch by non-multisig", async function(){
      const BATCH_AMOUNT = await tokenManager.BATCH_AMOUNT()
      const multisigBalance = await donut.balanceOf(multisigAddress)

      await expect(tokenManager.connect(carl).mintBatch()).to.be.revertedWith("NOT_MULTISIG");
    });

    it(`Should mint ${ANNUAL_MINT_AMOUNT} donut batch by multisig`, async function(){
      const BATCH_AMOUNT = parseEther(ANNUAL_MINT_AMOUNT)
      const multisigBalance = await donut.balanceOf(multisigAddress)
      await tokenManager.connect(multisig).mintBatch()

      expect(await donut.balanceOf(multisigAddress)).to.equal(BATCH_AMOUNT + multisigBalance);
    });

    it("Should disallow mint donut batch inside interval", async function(){
      await expect(tokenManager.connect(multisig).mintBatch()).to.be.revertedWith("TOO_SOON");
    });

    it("Should disable change donut controller", async function(){
      await tokenManager.connect(multisig).disableChangeDonutController();
      await expect(tokenManager.connect(multisig).changeDonutController(tokenManager.target)).to.be.revertedWith("NOT_ALLOWED");
    });

  })

})
