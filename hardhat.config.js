require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

const PRIVATE_KEY_1 = process.env.PRIVATE_KEY_1;
const PRIVATE_KEY_2 = process.env.PRIVATE_KEY_2;
const PRIVATE_KEY_3 = process.env.PRIVATE_KEY_3;
const PRIVATE_KEY_4 = process.env.PRIVATE_KEY_4;

module.exports = {
	solidity: "0.8.17",
	networks: {
		amoy: {
			url: process.env.ALCHEMY_API_URL || "https://rpc-amoy.polygon.io", // Replace with Amoy's actual RPC URL
			accounts: [
				PRIVATE_KEY_1,
				PRIVATE_KEY_2,
				PRIVATE_KEY_3,
				PRIVATE_KEY_4,
			],
			chainId: 80002,
		},
	},
	etherscan: {
		apiKey: process.env.POLYGONSCAN_API_KEY,
		customChains: [
			{
				network: "amoy", // Custom network name
				chainId: 80002, // Chain ID of Amoy
				urls: {
					// apiURL: "https://api-amoy.polygonscan.com/api", // Replace with Amoy's actual API URL
					apiURL: "https://rpc-amoy.polygon.technology/", // Replace with Amoy's actual API URL
					browserURL: "https://amoy.polygonscan.com", // Replace with Amoy's block explorer URL
				},
			},
		],
	},
};
