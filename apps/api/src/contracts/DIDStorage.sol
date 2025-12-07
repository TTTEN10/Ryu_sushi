// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DIDStorage
 * @dev Storage contract for DID-related data and metadata
 * @notice Separates storage from registry logic for gas optimization
 */
contract DIDStorage {
    // Events
    event DataStored(
        bytes32 indexed didHash,
        bytes32 indexed dataHash,
        address indexed owner,
        uint256 timestamp
    );
    
    event DataUpdated(
        bytes32 indexed didHash,
        bytes32 indexed dataHash,
        address indexed owner,
        uint256 timestamp
    );
    
    event DataDeleted(
        bytes32 indexed didHash,
        bytes32 indexed dataHash,
        address indexed owner,
        uint256 timestamp
    );

    // Reference to DIDRegistry
    address public didRegistry;

    // Struct to store data associated with a DID
    struct StoredData {
        bytes32 dataHash;              // Hash of the stored data
        bytes data;                    // The actual data (can be encrypted)
        string dataType;               // Type of data (e.g., "profile", "credentials")
        address owner;                 // Owner of the data
        uint256 createdAt;             // Block timestamp when data was created
        uint256 updatedAt;             // Block timestamp when data was last updated
        bool encrypted;                // Whether the data is encrypted
    }

    // Mapping from DID hash to array of data hashes
    mapping(bytes32 => bytes32[]) public didDataHashes;
    
    // Mapping from data hash to StoredData
    mapping(bytes32 => StoredData) public storedData;
    
    // Mapping to check if data hash exists
    mapping(bytes32 => bool) public dataExists;
    
    // Mapping from DID hash to index mapping for data hashes
    mapping(bytes32 => mapping(bytes32 => uint256)) public dataIndexInDIDArray;

    // Modifiers
    modifier onlyRegistry() {
        require(
            msg.sender == didRegistry,
            "DIDStorage: caller is not the registry"
        );
        _;
    }

    modifier onlyDataOwner(bytes32 dataHash) {
        require(
            storedData[dataHash].owner == msg.sender,
            "DIDStorage: caller is not the data owner"
        );
        require(dataExists[dataHash], "DIDStorage: data does not exist");
        _;
    }

    /**
     * @dev Constructor
     * @param _didRegistry Address of the DIDRegistry contract
     */
    constructor(address _didRegistry) {
        require(_didRegistry != address(0), "DIDStorage: registry address cannot be zero");
        didRegistry = _didRegistry;
    }

    /**
     * @dev Store data associated with a DID
     * @param didHash The hash of the DID
     * @param data The data to store
     * @param dataType The type of data
     * @param encrypted Whether the data is encrypted
     * @return dataHash The hash of the stored data
     */
    function storeData(
        bytes32 didHash,
        bytes memory data,
        string memory dataType,
        bool encrypted
    ) external onlyRegistry returns (bytes32) {
        bytes32 dataHash = keccak256(abi.encodePacked(didHash, data, block.timestamp));
        
        require(!dataExists[dataHash], "DIDStorage: data hash already exists");

        StoredData storage newData = storedData[dataHash];
        newData.dataHash = dataHash;
        newData.data = data;
        newData.dataType = dataType;
        newData.owner = tx.origin; // Use tx.origin to get the original sender
        newData.createdAt = block.timestamp;
        newData.updatedAt = block.timestamp;
        newData.encrypted = encrypted;

        dataExists[dataHash] = true;
        didDataHashes[didHash].push(dataHash);
        dataIndexInDIDArray[didHash][dataHash] = didDataHashes[didHash].length - 1;

        emit DataStored(didHash, dataHash, newData.owner, block.timestamp);

        return dataHash;
    }

    /**
     * @dev Update stored data
     * @param dataHash The hash of the data to update
     * @param newData The new data
     * @param encrypted Whether the new data is encrypted
     */
    function updateData(
        bytes32 dataHash,
        bytes memory newData,
        bool encrypted
    ) external onlyDataOwner(dataHash) {
        storedData[dataHash].data = newData;
        storedData[dataHash].updatedAt = block.timestamp;
        storedData[dataHash].encrypted = encrypted;

        emit DataUpdated(
            storedData[dataHash].dataHash,
            dataHash,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @dev Delete stored data
     * @param didHash The hash of the DID
     * @param dataHash The hash of the data to delete
     */
    function deleteData(bytes32 didHash, bytes32 dataHash)
        external
        onlyDataOwner(dataHash)
    {
        // Remove from array
        bytes32[] storage hashes = didDataHashes[didHash];
        uint256 index = dataIndexInDIDArray[didHash][dataHash];
        
        if (index < hashes.length - 1) {
            hashes[index] = hashes[hashes.length - 1];
            dataIndexInDIDArray[didHash][hashes[index]] = index;
        }
        
        hashes.pop();
        
        // Delete the data
        delete storedData[dataHash];
        dataExists[dataHash] = false;

        emit DataDeleted(didHash, dataHash, msg.sender, block.timestamp);
    }

    /**
     * @dev Get stored data
     * @param dataHash The hash of the data
     * @return data The stored data
     * @return dataType The type of data
     * @return owner The owner address
     * @return createdAt Creation timestamp
     * @return updatedAt Last update timestamp
     * @return encrypted Whether the data is encrypted
     */
    function getData(bytes32 dataHash)
        external
        view
        returns (
            bytes memory data,
            string memory dataType,
            address owner,
            uint256 createdAt,
            uint256 updatedAt,
            bool encrypted
        )
    {
        require(dataExists[dataHash], "DIDStorage: data does not exist");
        StoredData storage stored = storedData[dataHash];
        return (
            stored.data,
            stored.dataType,
            stored.owner,
            stored.createdAt,
            stored.updatedAt,
            stored.encrypted
        );
    }

    /**
     * @dev Get all data hashes for a DID
     * @param didHash The hash of the DID
     * @return Array of data hashes
     */
    function getDataHashesByDID(bytes32 didHash)
        external
        view
        returns (bytes32[] memory)
    {
        return didDataHashes[didHash];
    }

    /**
     * @dev Check if data exists
     * @param dataHash The hash of the data
     * @return Whether the data exists
     */
    function dataExistsCheck(bytes32 dataHash) external view returns (bool) {
        return dataExists[dataHash];
    }
}


