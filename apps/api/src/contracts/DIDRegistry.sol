// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DIDRegistry
 * @dev Decentralized Identity Registry for SafePsy Platform
 * @notice Manages DID creation, updates, and revocation on-chain
 */
contract DIDRegistry {
    // Events
    event DIDCreated(
        bytes32 indexed didHash,
        address indexed owner,
        string did,
        uint256 timestamp
    );
    
    event DIDUpdated(
        bytes32 indexed didHash,
        address indexed owner,
        string did,
        uint256 timestamp
    );
    
    event DIDRevoked(
        bytes32 indexed didHash,
        address indexed owner,
        uint256 timestamp
    );
    
    event OwnershipTransferred(
        bytes32 indexed didHash,
        address indexed oldOwner,
        address indexed newOwner,
        uint256 timestamp
    );

    // Struct to store DID information
    struct DIDRecord {
        string did;                    // Full DID string (e.g., "did:ethr:0x...")
        address owner;                 // Ethereum address that owns this DID
        uint256 createdAt;             // Block timestamp when DID was created
        uint256 updatedAt;             // Block timestamp when DID was last updated
        bool revoked;                  // Whether the DID has been revoked
        mapping(string => string) attributes; // Additional attributes (key-value pairs)
    }

    // Mapping from DID hash to DID record
    mapping(bytes32 => DIDRecord) public didRecords;
    
    // Mapping from owner address to array of DID hashes
    mapping(address => bytes32[]) public ownerDIDs;
    
    // Mapping from DID hash to index in ownerDIDs array (for efficient deletion)
    mapping(bytes32 => uint256) public didIndexInOwnerArray;
    
    // Mapping to check if DID hash exists
    mapping(bytes32 => bool) public didExists;

    // Modifiers
    modifier onlyOwner(bytes32 didHash) {
        require(
            didRecords[didHash].owner == msg.sender,
            "DIDRegistry: caller is not the owner"
        );
        require(
            !didRecords[didHash].revoked,
            "DIDRegistry: DID has been revoked"
        );
        _;
    }

    modifier didMustExist(bytes32 didHash) {
        require(didExists[didHash], "DIDRegistry: DID does not exist");
        _;
    }

    /**
     * @dev Create a new DID
     * @param did The full DID string
     * @param didHash The hash of the DID (for efficient lookup)
     */
    function createDID(string memory did, bytes32 didHash) external {
        require(!didExists[didHash], "DIDRegistry: DID already exists");
        require(bytes(did).length > 0, "DIDRegistry: DID cannot be empty");

        DIDRecord storage record = didRecords[didHash];
        record.did = did;
        record.owner = msg.sender;
        record.createdAt = block.timestamp;
        record.updatedAt = block.timestamp;
        record.revoked = false;

        didExists[didHash] = true;
        ownerDIDs[msg.sender].push(didHash);
        didIndexInOwnerArray[didHash] = ownerDIDs[msg.sender].length - 1;

        emit DIDCreated(didHash, msg.sender, did, block.timestamp);
    }

    /**
     * @dev Update DID information (only owner can update)
     * @param didHash The hash of the DID to update
     * @param newDID The new DID string
     */
    function updateDID(bytes32 didHash, string memory newDID)
        external
        onlyOwner(didHash)
    {
        require(bytes(newDID).length > 0, "DIDRegistry: DID cannot be empty");
        
        didRecords[didHash].did = newDID;
        didRecords[didHash].updatedAt = block.timestamp;

        emit DIDUpdated(didHash, msg.sender, newDID, block.timestamp);
    }

    /**
     * @dev Revoke a DID (only owner can revoke)
     * @param didHash The hash of the DID to revoke
     */
    function revokeDID(bytes32 didHash) external onlyOwner(didHash) {
        didRecords[didHash].revoked = true;
        didRecords[didHash].updatedAt = block.timestamp;

        emit DIDRevoked(didHash, msg.sender, block.timestamp);
    }

    /**
     * @dev Transfer ownership of a DID
     * @param didHash The hash of the DID
     * @param newOwner The new owner address
     */
    function transferOwnership(bytes32 didHash, address newOwner)
        external
        onlyOwner(didHash)
    {
        require(newOwner != address(0), "DIDRegistry: new owner cannot be zero address");
        require(newOwner != msg.sender, "DIDRegistry: new owner must be different");

        address oldOwner = didRecords[didHash].owner;
        didRecords[didHash].owner = newOwner;
        didRecords[didHash].updatedAt = block.timestamp;

        // Remove from old owner's array
        _removeFromOwnerArray(oldOwner, didHash);
        
        // Add to new owner's array
        ownerDIDs[newOwner].push(didHash);
        didIndexInOwnerArray[didHash] = ownerDIDs[newOwner].length - 1;

        emit OwnershipTransferred(didHash, oldOwner, newOwner, block.timestamp);
    }

    /**
     * @dev Set an attribute for a DID
     * @param didHash The hash of the DID
     * @param key The attribute key
     * @param value The attribute value
     */
    function setAttribute(
        bytes32 didHash,
        string memory key,
        string memory value
    ) external onlyOwner(didHash) {
        didRecords[didHash].attributes[key] = value;
        didRecords[didHash].updatedAt = block.timestamp;
    }

    /**
     * @dev Get an attribute for a DID
     * @param didHash The hash of the DID
     * @param key The attribute key
     * @return The attribute value
     */
    function getAttribute(bytes32 didHash, string memory key)
        external
        view
        didMustExist(didHash)
        returns (string memory)
    {
        return didRecords[didHash].attributes[key];
    }

    /**
     * @dev Get DID information
     * @param didHash The hash of the DID
     * @return did The DID string
     * @return owner The owner address
     * @return createdAt Creation timestamp
     * @return updatedAt Last update timestamp
     * @return revoked Whether the DID is revoked
     */
    function getDID(bytes32 didHash)
        external
        view
        didMustExist(didHash)
        returns (
            string memory did,
            address owner,
            uint256 createdAt,
            uint256 updatedAt,
            bool revoked
        )
    {
        DIDRecord storage record = didRecords[didHash];
        return (
            record.did,
            record.owner,
            record.createdAt,
            record.updatedAt,
            record.revoked
        );
    }

    /**
     * @dev Get all DIDs owned by an address
     * @param owner The owner address
     * @return Array of DID hashes
     */
    function getDIDsByOwner(address owner) external view returns (bytes32[] memory) {
        return ownerDIDs[owner];
    }

    /**
     * @dev Check if a DID is valid (exists and not revoked)
     * @param didHash The hash of the DID
     * @return Whether the DID is valid
     */
    function isValidDID(bytes32 didHash) external view returns (bool) {
        return didExists[didHash] && !didRecords[didHash].revoked;
    }

    /**
     * @dev Internal function to remove a DID from owner's array
     */
    function _removeFromOwnerArray(address owner, bytes32 didHash) internal {
        bytes32[] storage dids = ownerDIDs[owner];
        uint256 index = didIndexInOwnerArray[didHash];
        
        if (index < dids.length - 1) {
            dids[index] = dids[dids.length - 1];
            didIndexInOwnerArray[dids[index]] = index;
        }
        
        dids.pop();
    }
}


