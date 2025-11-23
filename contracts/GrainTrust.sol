// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GrainTrust
 * @dev Store and verify agricultural batch data on Polygon blockchain
 */
contract GrainTrust {
    
    // Batch record stored on blockchain
    struct BatchRecord {
        string batchCode;
        bytes32 dataHash;        // SHA-256 hash of batch data
        bytes32 merkleRoot;      // Merkle root of all stages
        uint256 timestamp;
        address submittedBy;
        bool exists;
    }
    
    // Mapping from batchId to BatchRecord
    mapping(string => BatchRecord) public batches;
    
    // Array to track all batch IDs
    string[] public batchIds;
    
    // Events
    event BatchSynced(
        string indexed batchId,
        string batchCode,
        bytes32 dataHash,
        bytes32 merkleRoot,
        uint256 timestamp,
        address indexed submittedBy
    );
    
    event BatchVerified(
        string indexed batchId,
        address indexed verifier,
        bool isValid
    );
    
    /**
     * @dev Sync batch data to blockchain
     * @param batchId Unique batch identifier
     * @param batchCode Human-readable batch code
     * @param dataHash SHA-256 hash of complete batch data
     * @param merkleRoot Merkle root of all stage data
     */
    function syncBatch(
        string memory batchId,
        string memory batchCode,
        bytes32 dataHash,
        bytes32 merkleRoot
    ) public {
        require(bytes(batchId).length > 0, "Batch ID cannot be empty");
        require(bytes(batchCode).length > 0, "Batch code cannot be empty");
        require(dataHash != bytes32(0), "Data hash cannot be zero");
        require(merkleRoot != bytes32(0), "Merkle root cannot be zero");
        
        // Check if batch already exists
        if (batches[batchId].exists) {
            revert("Batch already synced to blockchain");
        }
        
        // Create batch record
        batches[batchId] = BatchRecord({
            batchCode: batchCode,
            dataHash: dataHash,
            merkleRoot: merkleRoot,
            timestamp: block.timestamp,
            submittedBy: msg.sender,
            exists: true
        });
        
        // Add to array
        batchIds.push(batchId);
        
        // Emit event
        emit BatchSynced(
            batchId,
            batchCode,
            dataHash,
            merkleRoot,
            block.timestamp,
            msg.sender
        );
    }
    
    /**
     * @dev Verify batch data integrity
     * @param batchId Batch identifier to verify
     * @param dataHash Current data hash to verify against
     * @param merkleRoot Current merkle root to verify against
     * @return isValid True if data matches blockchain record
     */
    function verifyBatch(
        string memory batchId,
        bytes32 dataHash,
        bytes32 merkleRoot
    ) public returns (bool isValid) {
        require(batches[batchId].exists, "Batch not found on blockchain");
        
        BatchRecord memory batch = batches[batchId];
        isValid = (batch.dataHash == dataHash && batch.merkleRoot == merkleRoot);
        
        emit BatchVerified(batchId, msg.sender, isValid);
        
        return isValid;
    }
    
    /**
     * @dev Get batch record
     * @param batchId Batch identifier
     * @return batchCode Batch code
     * @return dataHash Data hash
     * @return merkleRoot Merkle root
     * @return timestamp Sync timestamp
     * @return submittedBy Address that submitted
     */
    function getBatch(string memory batchId) public view returns (
        string memory batchCode,
        bytes32 dataHash,
        bytes32 merkleRoot,
        uint256 timestamp,
        address submittedBy
    ) {
        require(batches[batchId].exists, "Batch not found");
        
        BatchRecord memory batch = batches[batchId];
        return (
            batch.batchCode,
            batch.dataHash,
            batch.merkleRoot,
            batch.timestamp,
            batch.submittedBy
        );
    }
    
    /**
     * @dev Check if batch exists on blockchain
     * @param batchId Batch identifier
     * @return exists True if batch exists
     */
    function batchExists(string memory batchId) public view returns (bool exists) {
        return batches[batchId].exists;
    }
    
    /**
     * @dev Get total number of batches
     * @return count Total batch count
     */
    function getBatchCount() public view returns (uint256 count) {
        return batchIds.length;
    }
    
    /**
     * @dev Get batch ID by index
     * @param index Index in array
     * @return batchId Batch identifier
     */
    function getBatchIdByIndex(uint256 index) public view returns (string memory batchId) {
        require(index < batchIds.length, "Index out of bounds");
        return batchIds[index];
    }
}
