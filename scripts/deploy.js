/* eslint-disable no-undef */
// const hre = require("hardhat");
import { create } from 'ipfs-http-client';

// Create an IPFS client instance
// Replace 'localhost' with your Docker host IP if needed
const ipfs = create({ url: 'http://localhost:5001' });

const folder_address = "QmcAbQotFmF3MrRPfrMBLGsnXiWsUKMUs7S4ZyChWM1Hjb"
// files_to_mint = ["1.json", "2.json", "3.json"]

async function fetchFromIPFS(cid, i) {
	console.log(`${cid}/${i+1}.json`)
	const content = await ipfs.cat(`${cid}/${i+1}.json`);
	let data = '';
	for await (const chunk of content) {
		data += new TextDecoder().decode(chunk);
	}
	console.log('Raw data from IPFS:');
    console.log(data);
	return JSON.parse(data);
  }

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
				`http://localhost:8080/ipfs/QmcAbQotFmF3MrRPfrMBLGsnXiWsUKMUs7S4ZyChWM1Hjb/${
					i + 1
				}.json`
			);
		await transaction.wait();
	}

	// for (let i = 0; i < 3; i++) {
	// 	try {
	// 		let cid = folder_address
	// 		const propertyData = await fetchFromIPFS(cid, i)


	// 		const transaction = await propertyNFT
	// 		.connect(seller)
	// 		.mint(
	// 			`http:localhost:8080/ipfs/${cid}`,
	// 			propertyData.name,
	// 			propertyData.address,
	// 			propertyData.description,
	// 			propertyData.image,
	// 			propertyData.attributes.find(attr => attr.trait_type === "Purchase Price").value,
	// 			propertyData.attributes.find(attr => attr.trait_type === "Type of Residence").value,
	// 			propertyData.attributes.find(attr => attr.trait_type === "Bed Rooms").value,
	// 			propertyData.attributes.find(attr => attr.trait_type === "Bathrooms").value,
	// 			propertyData.attributes.find(attr => attr.trait_type === "Square Feet").value,
	// 			propertyData.attributes.find(attr => attr.trait_type === "Year Built").value
	// 		);
	// 		await transaction.wait();
	// 		console.log(`Minted property ${i + 1}`);
	// 	} catch (error) {
	// 		console.error(`Error minting property ${i + 1}:`, error);
	// 	  }
	// }

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
