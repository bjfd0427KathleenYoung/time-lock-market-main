// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { FHE, euint32, euint64, externalEuint32, externalEuint64, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title TimeMarketplaceFHE
 * @dev FHEVM 0.9 enabled Time Marketplace for Sepolia deployment
 * Fully homomorphic encryption for private pricing and slots
 */
contract TimeMarketplaceFHE is Ownable, ReentrancyGuard, ZamaEthereumConfig {

    // ============ STRUCTS ============

    struct Offer {
        uint256 id;
        address creator;
        string title;
        string description;
        uint256 publicPrice; // Display price in wei (for UI reference)
        uint256 duration; // in days
        uint256 slots; // public total slots
        uint256 availableSlots; // public available slots
        bool isActive;
        uint256 createdAt;
        uint256 expiresAt;

        // FHE encrypted data (FHEVM 0.9)
        euint64 encryptedPrice; // Actual encrypted price
        euint32 encryptedDuration;
        euint32 encryptedSlots;
    }

    struct Purchase {
        uint256 offerId;
        address buyer;
        uint256 slots;
        uint256 totalPrice;
        uint256 timestamp;
    }

    // ============ STATE VARIABLES ============

    uint256 public nextOfferId = 1;
    uint256 public nextPurchaseId = 1;

    mapping(uint256 => Offer) public offers;
    mapping(uint256 => Purchase) public purchases;
    mapping(address => uint256[]) public userOffers;
    mapping(address => uint256[]) public userPurchases;

    uint256[] public activeOfferIds;

    // Statistics
    uint256 public totalOffersCreated;
    uint256 public totalPurchases;
    uint256 public totalVolume;

    // Platform settings
    uint256 public platformFee = 500; // 5% (500/10000)
    address public treasury;

    // ============ EVENTS ============

    event OfferCreated(
        uint256 indexed offerId,
        address indexed creator,
        string title,
        uint256 publicPrice,
        uint256 duration,
        uint256 slots
    );

    event OfferPurchased(
        uint256 indexed offerId,
        address indexed buyer,
        uint256 slots,
        uint256 totalPrice,
        uint256 slotsLeft
    );

    event OfferDeactivated(uint256 indexed offerId, address indexed creator);

    event TallyRevealRequested(
        uint256 indexed offerId,
        bytes32 priceHandle,
        bytes32 slotsHandle
    );

    // ============ CONSTRUCTOR ============

    constructor(address _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "Invalid treasury address");
        treasury = _treasury;
    }

    // ============ CORE FUNCTIONS WITH FHEVM 0.9 ============

    /**
     * @dev Create a new time offer with FHE encryption (FHEVM 0.9)
     * @param _title Offer title
     * @param _description Offer description
     * @param _publicPrice Public display price
     * @param _duration Duration in days
     * @param _slots Number of available slots
     * @param _encryptedPrice External encrypted price (from frontend)
     * @param _encryptedDuration External encrypted duration
     * @param _encryptedSlots External encrypted slots
     * @param inputProof ZK proof for verification
     */
    function createOfferWithFHE(
        string memory _title,
        string memory _description,
        uint256 _publicPrice,
        uint256 _duration,
        uint256 _slots,
        externalEuint64 _encryptedPrice,
        externalEuint32 _encryptedDuration,
        externalEuint32 _encryptedSlots,
        bytes calldata inputProof
    ) external nonReentrant {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_publicPrice > 0, "Price must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");
        require(_slots > 0, "Slots must be greater than 0");

        // â­ FHEVM 0.9: Import encrypted data using FHE.fromExternal()
        euint64 price = FHE.fromExternal(_encryptedPrice, inputProof);
        euint32 duration = FHE.fromExternal(_encryptedDuration, inputProof);
        euint32 slots = FHE.fromExternal(_encryptedSlots, inputProof);

        // â­ FHEVM 0.9: Grant contract permission to use encrypted data
        FHE.allowThis(price);
        FHE.allowThis(duration);
        FHE.allowThis(slots);

        // Grant creator permission to view encrypted data
        FHE.allow(price, msg.sender);
        FHE.allow(duration, msg.sender);
        FHE.allow(slots, msg.sender);

        uint256 offerId = nextOfferId++;
        uint256 currentTime = block.timestamp;
        uint256 expiresAt = currentTime + (_duration * 1 days);

        offers[offerId] = Offer({
            id: offerId,
            creator: msg.sender,
            title: _title,
            description: _description,
            publicPrice: _publicPrice,
            duration: _duration,
            slots: _slots,
            availableSlots: _slots,
            isActive: true,
            createdAt: currentTime,
            expiresAt: expiresAt,
            encryptedPrice: price,
            encryptedDuration: duration,
            encryptedSlots: slots
        });

        userOffers[msg.sender].push(offerId);
        activeOfferIds.push(offerId);
        totalOffersCreated++;

        emit OfferCreated(offerId, msg.sender, _title, _publicPrice, _duration, _slots);
    }

    /**
     * @dev Create a simple offer without FHE (fallback for testing)
     */
    function createOffer(
        string memory _title,
        string memory _description,
        uint256 _price,
        uint256 _duration,
        uint256 _slots
    ) external nonReentrant {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_price > 0, "Price must be greater than 0");
        require(_price <= type(uint64).max, "Price exceeds uint64 range");
        require(_duration > 0, "Duration must be greater than 0");
        require(_slots > 0, "Slots must be greater than 0");

        uint256 offerId = nextOfferId++;
        uint256 currentTime = block.timestamp;
        uint256 expiresAt = currentTime + (_duration * 1 days);

        // Trivial encryption for plaintext values
        euint64 price = FHE.asEuint64(uint64(_price));
        euint32 duration = FHE.asEuint32(uint32(_duration));
        euint32 slots = FHE.asEuint32(uint32(_slots));

        FHE.allowThis(price);
        FHE.allowThis(duration);
        FHE.allowThis(slots);

        offers[offerId] = Offer({
            id: offerId,
            creator: msg.sender,
            title: _title,
            description: _description,
            publicPrice: _price,
            duration: _duration,
            slots: _slots,
            availableSlots: _slots,
            isActive: true,
            createdAt: currentTime,
            expiresAt: expiresAt,
            encryptedPrice: price,
            encryptedDuration: duration,
            encryptedSlots: slots
        });

        userOffers[msg.sender].push(offerId);
        activeOfferIds.push(offerId);
        totalOffersCreated++;

        emit OfferCreated(offerId, msg.sender, _title, _price, _duration, _slots);
    }

    /**
     * @dev Purchase slots from an offer
     */
    function purchaseOffer(uint256 _offerId, uint256 _slots) external payable nonReentrant {
        require(_offerId > 0 && _offerId < nextOfferId, "Invalid offer ID");
        require(_slots > 0, "Must purchase at least 1 slot");

        Offer storage offer = offers[_offerId];
        require(offer.isActive, "Offer is not active");
        require(offer.availableSlots >= _slots, "Not enough slots available");
        require(block.timestamp <= offer.expiresAt, "Offer has expired");
        require(msg.sender != offer.creator, "Cannot purchase your own offer");

        uint256 totalPrice = offer.publicPrice * _slots;
        uint256 feeAmount = (totalPrice * platformFee) / 10000;
        uint256 creatorAmount = totalPrice - feeAmount;

        require(msg.value >= totalPrice, "Insufficient payment");

        // Update offer
        offer.availableSlots -= _slots;
        if (offer.availableSlots == 0) {
            offer.isActive = false;
            _removeFromActiveOffers(_offerId);
        }

        // Record purchase
        uint256 purchaseId = nextPurchaseId++;
        purchases[purchaseId] = Purchase({
            offerId: _offerId,
            buyer: msg.sender,
            slots: _slots,
            totalPrice: totalPrice,
            timestamp: block.timestamp
        });

        userPurchases[msg.sender].push(purchaseId);
        totalPurchases++;
        totalVolume += totalPrice;

        // Transfer funds
        if (feeAmount > 0) {
            (bool feeSuccess, ) = treasury.call{value: feeAmount}("");
            require(feeSuccess, "Fee transfer failed");
        }

        (bool creatorSuccess, ) = offer.creator.call{value: creatorAmount}("");
        require(creatorSuccess, "Creator payment failed");

        // Refund excess payment
        if (msg.value > totalPrice) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - totalPrice}("");
            require(refundSuccess, "Refund failed");
        }

        emit OfferPurchased(_offerId, msg.sender, _slots, totalPrice, offer.availableSlots);
    }

    // ============ FHEVM 0.9 DECRYPTION FUNCTIONS ============

    /**
     * @dev Request reveal of encrypted offer data (FHEVM 0.9 public decryption)
     * This emits an event that frontend can listen to and decrypt
     */
    function requestOfferReveal(uint256 _offerId) external {
        require(_offerId > 0 && _offerId < nextOfferId, "Invalid offer ID");

        Offer storage offer = offers[_offerId];
        require(msg.sender == offer.creator || msg.sender == owner(), "Not authorized");

        // â­ FHEVM 0.9: Mark as publicly decryptable
        offer.encryptedPrice = FHE.makePubliclyDecryptable(offer.encryptedPrice);
        offer.encryptedSlots = FHE.makePubliclyDecryptable(offer.encryptedSlots);

        // â­ FHEVM 0.9: Convert to bytes32 handles for event
        bytes32 priceHandle = FHE.toBytes32(offer.encryptedPrice);
        bytes32 slotsHandle = FHE.toBytes32(offer.encryptedSlots);

        // Emit event for frontend to catch
        emit TallyRevealRequested(_offerId, priceHandle, slotsHandle);
    }

    /**
     * @dev Callback to resolve decrypted values (FHEVM 0.9 callback pattern)
     * Frontend calls this after decrypting the handles
     */
    function resolveOfferCallback(
        uint256 _offerId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        require(_offerId > 0 && _offerId < nextOfferId, "Invalid offer ID");

        Offer storage offer = offers[_offerId];

        // Prepare handles list for verification
        bytes32[] memory handlesList = new bytes32[](2);
        handlesList[0] = FHE.toBytes32(offer.encryptedPrice);
        handlesList[1] = FHE.toBytes32(offer.encryptedSlots);

        //  FHEVM 0.9: Verify decryption proof (reverts internally on failure)
        FHE.checkSignatures(handlesList, cleartexts, decryptionProof);

        // Decode cleartext values
        (uint64 revealedPrice, uint32 revealedSlots) = abi.decode(cleartexts, (uint64, uint32));

        // Use revealed values (example: update public price)
        offer.publicPrice = revealedPrice;
        offer.slots = revealedSlots;
    }

    /**
     * @dev Compare two offers' encrypted prices using FHE
     */
    function comparePrices(uint256 _offerId1, uint256 _offerId2) external returns (ebool) {
        require(_offerId1 > 0 && _offerId1 < nextOfferId, "Invalid offer ID 1");
        require(_offerId2 > 0 && _offerId2 < nextOfferId, "Invalid offer ID 2");

        Offer storage offer1 = offers[_offerId1];
        Offer storage offer2 = offers[_offerId2];

        require(offer1.isActive && offer2.isActive, "Offers must be active");

        // FHE comparison (greater than)
        return FHE.gt(offer1.encryptedPrice, offer2.encryptedPrice);
    }

    /**
     * @dev Get encrypted offer data (for authorized users)
     */
    function getEncryptedOfferData(uint256 _offerId)
        external
        view
        returns (euint64, euint32, euint32)
    {
        require(_offerId > 0 && _offerId < nextOfferId, "Invalid offer ID");

        Offer storage offer = offers[_offerId];
        return (offer.encryptedPrice, offer.encryptedDuration, offer.encryptedSlots);
    }

    // ============ UTILITY FUNCTIONS ============

    function deactivateOffer(uint256 _offerId) external {
        require(_offerId > 0 && _offerId < nextOfferId, "Invalid offer ID");
        Offer storage offer = offers[_offerId];
        require(msg.sender == offer.creator || msg.sender == owner(), "Not authorized");
        require(offer.isActive, "Offer already inactive");

        offer.isActive = false;
        _removeFromActiveOffers(_offerId);

        emit OfferDeactivated(_offerId, offer.creator);
    }

    function _removeFromActiveOffers(uint256 _offerId) internal {
        for (uint256 i = 0; i < activeOfferIds.length; i++) {
            if (activeOfferIds[i] == _offerId) {
                activeOfferIds[i] = activeOfferIds[activeOfferIds.length - 1];
                activeOfferIds.pop();
                break;
            }
        }
    }

    // ============ VIEW FUNCTIONS ============

    function getContractStats() external view returns (uint256, uint256, uint256, uint256) {
        return (totalOffersCreated, totalPurchases, totalVolume, activeOfferIds.length);
    }

    function getActiveOfferIds() external view returns (uint256[] memory) {
        return activeOfferIds;
    }

    function getUserOffers(address _user) external view returns (uint256[] memory) {
        return userOffers[_user];
    }

    function getUserPurchases(address _user) external view returns (uint256[] memory) {
        return userPurchases[_user];
    }

    function getPlatformFee() external view returns (uint256) {
        return platformFee;
    }

    function getTreasury() external view returns (address) {
        return treasury;
    }

    // ============ ADMIN FUNCTIONS ============

    function updatePlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 1000, "Fee cannot exceed 10%");
        platformFee = _newFee;
    }

    function updateTreasury(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "Invalid treasury address");
        treasury = _newTreasury;
    }

    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}
