// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IERC721 {
    function transferFrom(address _from, address _to, uint256 _id) external;
}

contract Escrow {
    address public nftAddress;
    address payable public seller;
    address public inspector;
    address payable public lender;


    modifier onlyBuyer(uint256 _nftID) {
        require(msg.sender == buyer[_nftID], "Only buyer can call this method");
        _;
    }

    modifier onlySeller() {
        require(msg.sender == seller, "Only seller can call this method");
        _;
    }

    modifier onlyInspector() {
        require(msg.sender == inspector, "Only inspector can call this method");
        _;
    }

    mapping(uint256 => bool) public isListed;
    mapping(uint256 => uint256) public purchasePrice;
    mapping(uint256 => uint256) public escrowAmount;
    mapping(uint256 => address) public buyer;
    mapping(uint256 => bool) public inspectionPassed;
    mapping(uint256 => mapping(address => bool)) public approval;
    
    // New mappings
    mapping(uint256 => uint256) public timeToPay;
    mapping(uint256 => uint256) public interestRate;
    mapping(uint256 => uint256) public lendedAmount;
    mapping(uint256 => uint256) public remainingAmount;
    mapping(uint256 => address) public currentOwner;
    mapping(uint256 => uint256) public loanStartTime;

    constructor(
        address _nftAddress,
        address payable _seller,
        address _inspector,
        address payable _lender
    ) {
        nftAddress = _nftAddress;
        seller = _seller;
        inspector = _inspector;
        lender = _lender;
    }

    function list(
        uint256 _nftID,
        address _buyer,
        uint256 _purchasePrice,
        uint256 _escrowAmount,
        uint256 _timeToPay,
        uint256 _interestRate
    ) public payable onlySeller {
        IERC721(nftAddress).transferFrom(msg.sender, address(this), _nftID);

        isListed[_nftID] = true;
        purchasePrice[_nftID] = _purchasePrice;
        escrowAmount[_nftID] = _escrowAmount;
        buyer[_nftID] = _buyer;
        timeToPay[_nftID] = _timeToPay;
        interestRate[_nftID] = _interestRate;
        currentOwner[_nftID] = address(this);
    }

    function depositEarnest(uint256 _nftID) public payable onlyBuyer(_nftID) {
        require(msg.value >= escrowAmount[_nftID], "Insufficient earnest amount");
    }

    function updateInspectionStatus(uint256 _nftID, bool _passed) public onlyInspector {
        inspectionPassed[_nftID] = _passed;
    }

    function approveSale(uint256 _nftID) public {
        approval[_nftID][msg.sender] = true;
    }

    function finalizeSale(uint256 _nftID) public {
        require(inspectionPassed[_nftID], "Inspection not passed");
        require(approval[_nftID][buyer[_nftID]], "Buyer not approved");
        require(approval[_nftID][seller], "Seller not approved");
        require(approval[_nftID][lender], "Lender not approved");
        require(address(this).balance >= purchasePrice[_nftID], "Insufficient funds");

        isListed[_nftID] = false;

        // Transfer the full amount to the seller
        (bool success, ) = payable(seller).call{value: purchasePrice[_nftID]}("");
        require(success, "Transfer to seller failed");

        // Calculate the lended amount
        lendedAmount[_nftID] = purchasePrice[_nftID] - escrowAmount[_nftID];
        
        // Calculate initial interest
        uint256 initialInterest = (lendedAmount[_nftID] * interestRate[_nftID]) / 100;
        
        // Set remaining amount to lended amount plus initial interest
        remainingAmount[_nftID] = lendedAmount[_nftID] + initialInterest;
        
        loanStartTime[_nftID] = block.timestamp;

        // The NFT remains with the contract
        currentOwner[_nftID] = address(this);
    }

    // Cancel Sale (handle earnest deposit)
    // -> if inspection status is not approved, then refund, otherwise send to seller
    function cancelSale(uint256 _nftID) public {
        if (inspectionPassed[_nftID] == false) {
            payable(buyer[_nftID]).transfer(address(this).balance);
        } else {
            payable(seller).transfer(address(this).balance);
        }
    }

    function makePayment(uint256 _nftID) public payable onlyBuyer(_nftID) {
        require(remainingAmount[_nftID] > 0, "Loan already paid off");
        
        uint256 payment = msg.value;
        uint256 currentTime = block.timestamp;
        uint256 timeElapsed = currentTime - loanStartTime[_nftID];
        uint256 yearsElapsed = timeElapsed / 365 days;
        
        // Calculate interest
        uint256 interest = (remainingAmount[_nftID] * interestRate[_nftID] * yearsElapsed) / 100;
        uint256 totalDue = remainingAmount[_nftID] + interest;

        if (payment >= totalDue) {
            // Full payment
            (bool success, ) = payable(lender).call{value: totalDue}("");
            require(success, "Transfer to lender failed");
            
            // Refund excess payment
            if (payment > totalDue) {
                (bool refundSuccess, ) = payable(buyer[_nftID]).call{value: payment - totalDue}("");
                require(refundSuccess, "Refund to buyer failed");
            }

            // Transfer NFT to buyer
            IERC721(nftAddress).transferFrom(address(this), buyer[_nftID], _nftID);
            currentOwner[_nftID] = buyer[_nftID];
            remainingAmount[_nftID] = 0;
            isListed[_nftID] = false;
        } else {
            // Partial payment
            remainingAmount[_nftID] = totalDue - payment;
            (bool success, ) = payable(lender).call{value: payment}("");
            require(success, "Transfer to lender failed");
        }

        // Reset loan start time for next interest calculation
        loanStartTime[_nftID] = currentTime;
    }

    function checkLoanStatus(uint256 _nftID) public {
        require(isListed[_nftID] == false, "Property not sold yet");
        require(remainingAmount[_nftID] > 0, "Loan already paid off");

        uint256 currentTime = block.timestamp;
        uint256 loanDuration = (currentTime - loanStartTime[_nftID]) / 30 days; // Convert to months

        if (loanDuration > timeToPay[_nftID]) {
            // Loan defaulted, transfer NFT to lender
            IERC721(nftAddress).transferFrom(address(this), lender, _nftID);
            currentOwner[_nftID] = lender;
            remainingAmount[_nftID] = 0;
            isListed[_nftID] = false;
        }
    }

    function getCurrentOwner(uint256 _nftID) public view returns (address) {
        return currentOwner[_nftID];
    }

    function getRemainingAmount(uint256 _nftID) public view returns (uint256) {
        return remainingAmount[_nftID];
    }

    receive() external payable {}

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}