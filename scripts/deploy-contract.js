/**
 * Deploy GrainTrust Smart Contract to Polygon Amoy Testnet
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-contract.js --network amoy
 */

const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying GrainTrust Contract to Polygon Amoy...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "POL\n");

  if (balance === 0n) {
    console.error("❌ ERROR: No POL in wallet!");
    console.log("📍 Get testnet POL from: https://faucet.polygon.technology/");
    process.exit(1);
  }

  // Deploy contract
  console.log("📦 Compiling and deploying contract...");
  const GrainTrust = await hre.ethers.getContractFactory("GrainTrust");
  const contract = await GrainTrust.deploy();

  console.log("⏳ Waiting for deployment...");
  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log("\n✅ SUCCESS! Contract deployed to:", address);
  console.log("\n📋 Next Steps:");
  console.log("1. Add to .env file:");
  console.log(`   POLYGON_CONTRACT_ADDRESS=${address}`);
  console.log("\n2. View on PolygonScan:");
  console.log(`   https://amoy.polygonscan.com/address/${address}`);
  console.log("\n3. Verify contract (optional):");
  console.log(`   npx hardhat verify --network amoy ${address}`);
  
  // Save deployment info
  const deploymentInfo = {
    network: "polygon-amoy",
    contractAddress: address,
    deployerAddress: deployer.address,
    deployedAt: new Date().toISOString(),
    explorerUrl: `https://amoy.polygonscan.com/address/${address}`
  };

  console.log("\n📄 Deployment Info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
