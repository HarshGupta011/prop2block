import { useEffect, useState } from "react";
import { ethers } from "ethers";

// Components
import Navigation from "./components/Navigation";
import Search from "./components/Search";
import Home from "./components/Home";

// ABIs
import PropertyNFT from "./abis/PropertyNFT.json";
import Escrow from "./abis/Escrow.json";

// Config
import config from "./config.json";

const ALCHEMY_API_URL =
	"https://polygon-amoy.g.alchemy.com/v2/lEd0ZUG0gxhKpLx2CtvrRVB8qK201Vx8" ||
	process.env.ALCHEMY_API_URL;
console.log("ALCHEMY_API_URL: ", ALCHEMY_API_URL);

const polygonAmoyNetwork = {
	chainId: `0x13882`, // 80002 in hexadecimal
	// chainId: `80002`,
	chainName: "Polygon Amoy Testnet",
	nativeCurrency: {
		name: "POL",
		symbol: "POL",
		decimals: 18,
	},
	rpcUrls: [ALCHEMY_API_URL],
	blockExplorerUrls: ["https://amoy.polygonscan.com"],
};

function App() {
	const [provider, setProvider] = useState(null);
	const [escrow, setEscrow] = useState(null);
	const [account, setAccount] = useState(null);
	const [homes, setHomes] = useState([]);
	const [home, setHome] = useState({});
	const [toggle, setToggle] = useState(false);

	const connectWallet = async () => {
		if (typeof window.ethereum !== "undefined") {
			try {
				// Request account access
				await window.ethereum.request({
					method: "eth_requestAccounts",
				});

				// Check if the user is already connected to the target chain
				const currentChainId = await window.ethereum.request({
					method: "eth_chainId",
				});
				const targetChainId = `0x13882`; // Hexadecimal for 80002

				if (currentChainId !== targetChainId) {
					// Switch to the desired chain if not already on it
					await window.ethereum.request({
						method: "wallet_addEthereumChain",
						params: [polygonAmoyNetwork],
					});
				}

				const provider = new ethers.providers.Web3Provider(
					window.ethereum
				);
				setProvider(provider);

				const signer = provider.getSigner();
				const address = await signer.getAddress();
				setAccount(address);

				return provider;
			} catch (error) {
				if (error.code === -32002) {
					console.error(
						"A request is already pending. Please wait for it to complete."
					);
				} else {
					console.error("Failed to connect to wallet:", error);
				}
			}
		} else {
			console.log("Please install MetaMask!");
		}
	};

	const loadBlockchainData = async () => {
		const provider = await connectWallet();
		console.log("provider: ", provider);
		if (provider) {
			const network = await provider.getNetwork();
			console.log("network: ", network);

			// Make sure to update your config.json to include Mumbai network details
			const propertyNFT = new ethers.Contract(
				config[network.chainId].propertyNFT.address,
				PropertyNFT,
				provider
			);
			const totalSupply = await propertyNFT.totalSupply();
			const homes = [];

			for (var i = 1; i <= totalSupply; i++) {
				const uri = await propertyNFT.tokenURI(i);
				const response = await fetch(uri);
				const metadata = await response.json();
				homes.push(metadata);
			}

			setHomes(homes);

			const escrow = new ethers.Contract(
				config[network.chainId].escrow.address,
				Escrow,
				provider
			);
			setEscrow(escrow);

			window.ethereum.on("accountsChanged", async () => {
				const accounts = await window.ethereum.request({
					method: "eth_requestAccounts",
				});
				const account = ethers.utils.getAddress(accounts[0]);
				setAccount(account);
			});
		}
	};

	useEffect(() => {
		loadBlockchainData();

		// Cleanup function to remove event listener
		return () => {
			window.ethereum.removeListener("accountsChanged", async () => {});
		};
	}, []);

	const togglePop = (home) => {
		setHome(home);
		toggle ? setToggle(false) : setToggle(true);
	};

	return (
		<div>
			<Navigation account={account} setAccount={setAccount} />
			<Search />

			<div className="cards__section">
				<h3>Homes For You</h3>
				<hr />
				<div className="cards">
					{homes.map((home, index) => (
						<div
							className="card"
							key={index}
							onClick={() => togglePop(home)}
						>
							<div className="card__image">
								<img src={home.image} alt="Home" />
							</div>
							<div className="card__info">
								<h4>{home.attributes[0].value} ETH</h4>
								<p>
									<strong>{home.attributes[2].value}</strong>{" "}
									bds |
									<strong>{home.attributes[3].value}</strong>{" "}
									ba |
									<strong>{home.attributes[4].value}</strong>{" "}
									sqft
								</p>
								<p>{home.address}</p>
							</div>
						</div>
					))}
				</div>
			</div>

			{toggle && (
				<Home
					home={home}
					provider={provider}
					account={account}
					escrow={escrow}
					togglePop={togglePop}
				/>
			)}
		</div>
	);
}

export default App;
