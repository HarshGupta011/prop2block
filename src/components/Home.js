import { ethers } from "ethers";
import { useEffect, useState } from "react";

import close from "../assets/close.svg";

const Home = ({ home, provider, account, escrow, togglePop }) => {
	const [hasBought, setHasBought] = useState(false);
	const [hasLended, setHasLended] = useState(false);
	const [hasInspected, setHasInspected] = useState(false);
	const [hasSold, setHasSold] = useState(false);

	const [buyer, setBuyer] = useState(null);
	const [lender, setLender] = useState(null);
	const [inspector, setInspector] = useState(null);
	const [seller, setSeller] = useState(null);

	const [owner, setOwner] = useState(null);
	const [escrowAmount, setEscrowAmount] = useState(0);
	const [remainingAmount, setRemainingAmount] = useState(0);
	const [escrowPaid, setEscrowPaid] = useState(false);
	const [paymentAmount, setPaymentAmount] = useState("");

	const fetchDetails = async () => {
		// -- Buyer
		const buyer = await escrow.buyer(home.id);
		setBuyer(buyer);
		console.log("buyer: ", buyer);

		const hasBought = await escrow.approval(home.id, buyer);
		setHasBought(hasBought);
		console.log("hasBought: ", hasBought);

		// -- Seller
		const seller = await escrow.seller();
		setSeller(seller);
		console.log("seller: ", seller);

		const hasSold = await escrow.approval(home.id, seller);
		setHasSold(hasSold);
		console.log("hasSold: ", hasSold);

		// -- Lender
		const lender = await escrow.lender();
		setLender(lender);
		console.log("lender: ", lender);

		const hasLended = await escrow.approval(home.id, lender);
		setHasLended(hasLended);
		console.log("hasLended: ", hasLended);

		// -- Inspector
		const inspector = await escrow.inspector();
		setInspector(inspector);
		console.log("inspector: ", inspector);

		const hasInspected = await escrow.inspectionPassed(home.id);
		setHasInspected(hasInspected);
		console.log("hasInspected: ", hasInspected);

		const escrowAmount = await escrow.escrowAmount(home.id);
		setEscrowAmount(ethers.utils.formatEther(escrowAmount));
		console.log("escrowAmount: ", escrowAmount);

		const escrowPaid = (await escrow.getBalance()) >= escrowAmount;
		setEscrowPaid(escrowPaid);
		console.log("escrowPaid: ", escrowPaid);
	};

	const fetchOwner = async () => {
		if (await escrow.isListed(home.id)) return;

		const owner = await escrow.getCurrentOwner(home.id);
		setOwner(owner);

		const remainingAmount = await escrow.getRemainingAmount(home.id);
		setRemainingAmount(ethers.utils.formatEther(remainingAmount));

		// Fetch lended amount and interest rate for additional information
		const lendedAmount = await escrow.lendedAmount(home.id);
		const interestRate = await escrow.interestRate(home.id);
		console.log("Lended Amount:", ethers.utils.formatEther(lendedAmount));
		console.log("Interest Rate:", interestRate.toString(), "%");
	};

	const buyHandler = async () => {
		const escrowAmount = await escrow.escrowAmount(home.id);
		const signer = await provider.getSigner();

		try {
			// Buyer deposit earnest
			let transaction = await escrow
				.connect(signer)
				.depositEarnest(home.id, { value: escrowAmount });
			await transaction.wait();

			// Buyer approves...
			transaction = await escrow.connect(signer).approveSale(home.id);
			await transaction.wait();

			setHasBought(true);
			setEscrowPaid(true);
		} catch (error) {
			if (error.message.includes("Nonce too high")) {
				console.error(
					"Nonce too high error. Please reset your account in MetaMask."
				);
				alert(
					"Transaction failed due to nonce mismatch. Please reset your account in MetaMask and try again."
				);
			} else {
				console.error("Error in buyHandler:", error);
				alert(
					"Transaction failed. Please check the console for more details."
				);
			}
		}
	};

	const inspectHandler = async () => {
		const signer = await provider.getSigner();

		// Inspector updates status
		const transaction = await escrow
			.connect(signer)
			.updateInspectionStatus(home.id, true);
		await transaction.wait();

		setHasInspected(true);
	};

	const lendHandler = async () => {
		const signer = await provider.getSigner();

		// Lender approves...
		const transaction = await escrow.connect(signer).approveSale(home.id);
		await transaction.wait();

		// Lender sends funds to contract...
		const lendAmount =
			(await escrow.purchasePrice(home.id)) -
			(await escrow.escrowAmount(home.id));
		await signer.sendTransaction({
			to: escrow.address,
			value: lendAmount.toString(),
			gasLimit: 60000,
		});

		setHasLended(true);
	};

	const sellHandler = async () => {
		const signer = await provider.getSigner();

		// Seller approves...
		let transaction = await escrow.connect(signer).approveSale(home.id);
		await transaction.wait();

		// Seller finalize...
		transaction = await escrow.connect(signer).finalizeSale(home.id);
		await transaction.wait();

		setHasSold(true);
	};

	const paymentHandler = async () => {
		const signer = await provider.getSigner();

		// Convert POL amount
		const paymentAmountWei = ethers.utils.parseEther(paymentAmount);

		// Make payment
		const transaction = await escrow
			.connect(signer)
			.makePayment(home.id, { value: paymentAmountWei });
		await transaction.wait();

		// Refresh remaining amount
		const newRemainingAmount = await escrow.getRemainingAmount(home.id);
		setRemainingAmount(ethers.utils.formatEther(newRemainingAmount));

		// Clear payment input
		setPaymentAmount("");

		// Refresh owner (in case ownership has changed)
		fetchOwner();
	};

	useEffect(() => {
		fetchDetails();
		fetchOwner();
	}, [hasSold]);

	return (
		<div className="home">
			<div className="home__details">
				<div className="home__image">
					<img src={home.image} alt="Home" />
				</div>
				<div className="home__overview">
					<h1>{home.name}</h1>
					<p>
						<strong>{home.attributes[2].value}</strong> bds |
						<strong>{home.attributes[3].value}</strong> ba |
						<strong>{home.attributes[4].value}</strong> sqft
					</p>
					<p>{home.address}</p>

					<h2>{home.attributes[0].value} POL</h2>

					{owner ? (
						<div className="home__owned">
							{account === buyer && (
								<>
									<p>
										Remaining Amount (including interest):{" "}
										{remainingAmount} POL
									</p>
									{remainingAmount > 0 && (
										<div>
											<input
												type="number"
												value={paymentAmount}
												onChange={(e) =>
													setPaymentAmount(
														e.target.value
													)
												}
												placeholder="Payment amount (POL)"
											/>
											<button onClick={paymentHandler}>
												Make Payment
											</button>
										</div>
									)}
									{remainingAmount === "0.0" && (
										<p> Property Fully Paid</p>
									)}
								</>
							)}
							{account === seller && <p>Property Sold</p>}
							{account === lender && <p>Loan Issued</p>}
							{account === inspector && (
								<p>Inspection Completed</p>
							)}
						</div>
					) : (
						<div>
							{account === inspector ? (
								escrowPaid ? (
									hasInspected ? (
										<p>Inspected</p>
									) : (
										<button
											className="home__buy"
											onClick={inspectHandler}
											disabled={hasInspected}
										>
											Approve Inspection
										</button>
									)
								) : (
									<p>Waiting for buyer to pay escrow</p>
								)
							) : account === lender ? (
								hasInspected ? (
									hasLended ? (
										<p>Lended</p>
									) : (
										<button
											className="home__buy"
											onClick={lendHandler}
											disabled={hasLended}
										>
											Approve & Lend
										</button>
									)
								) : (
									<p>Waiting for inspection</p>
								)
							) : account === seller ? (
								hasLended ? (
									hasSold ? (
										<p>Property Sold</p>
									) : (
										<button
											className="home__buy"
											onClick={sellHandler}
											disabled={hasSold}
										>
											Approve & Sell
										</button>
									)
								) : (
									<p>Waiting for lender</p>
								)
							) : account === buyer ? (
								hasBought ? (
									<p>Waiting for approval</p>
								) : (
									<>
										<p>Escrow Amount: {escrowAmount} POL</p>
										<button
											className="home__buy"
											onClick={buyHandler}
											disabled={hasBought}
										>
											Buy
										</button>
									</>
								)
							) : (
								<p>Connect wallet to interact</p>
							)}
						</div>
					)}

					<hr />

					<h2>Overview</h2>

					<p>{home.description}</p>

					<hr />

					<h2>Facts and features</h2>

					<ul>
						{home.attributes.map((attribute, index) => (
							<li key={index}>
								<strong>{attribute.trait_type}</strong> :{" "}
								{attribute.value}
							</li>
						))}
					</ul>
				</div>

				<button onClick={togglePop} className="home__close">
					<img src={close} alt="Close" />
				</button>
			</div>
		</div>
	);
};

export default Home;
