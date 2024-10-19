/* eslint-disable no-undef */
const hre = require("hardhat");

const tokens = (n) => {
	return ethers.utils.parseUnits(n.toString(), "ether");
};

async function main() {
	// Setup accounts
	const [buyer, seller, inspector, lender] = await ethers.getSigners();

	// Deploy Real Estate
	const PropertyNFT = await ethers.getContractFactory("PropertyNFT");
	const propertyNFT = await PropertyNFT.deploy();
	await propertyNFT.deployed();

	console.log(`Deployed Real Estate Contract at: ${propertyNFT.address}`);
	console.log(`Minting 3 properties...\n`);

	for (let i = 0; i < 3; i++) {
		const transaction = await propertyNFT
			.connect(seller)
			.mint(
				`https://ipfs.io/ipfs/QmQVcpsjrA6cr1iJjZAodYwmPekYgbnXGo4DFubJiLc2EB/${
					i + 1
				}.json`
			);
		await transaction.wait();
	}

	// Deploy Escrow
	const Escrow = await ethers.getContractFactory("Escrow");
	const escrow = await Escrow.deploy(
		propertyNFT.address,
		seller.address,
		inspector.address,
		lender.address
	);
	await escrow.deployed();

	console.log(`Deployed Escrow Contract at: ${escrow.address}`);
	console.log(`Listing 3 properties...\n`);

	for (let i = 0; i < 3; i++) {
		// Approve properties...
		let transaction = await propertyNFT
			.connect(seller)
			.approve(escrow.address, i + 1);
		await transaction.wait();
	}

	// Listing properties...
	let transaction = await escrow
		.connect(seller)
		.list(1, buyer.address, tokens(20), tokens(10), 6, 10);
	await transaction.wait();

	transaction = await escrow
		.connect(seller)
		.list(2, buyer.address, tokens(15), tokens(5), 12, 10);
	await transaction.wait();

	transaction = await escrow
		.connect(seller)
		.list(3, buyer.address, tokens(10), tokens(5), 24, 10);
	await transaction.wait();

	console.log(`Finished.`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
