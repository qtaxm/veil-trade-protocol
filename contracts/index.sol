// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/* Zama official FHE library (only!) */
import { FHE, ebool, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
/* Network config for Sepolia (KMS/ACL/Oracle addresses) */
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title BlindBarter
 * @notice Two parties submit encrypted valuations; the contract checks whether
 *         the swap is "fair" within ±X% (tolerance in basis points) and returns only an encrypted boolean.
 *
 *         Fairness criterion (symmetric):
 *           max(A, B) * 10_000 <= min(A, B) * (10_000 + tolBps)
 *
 *         - Inputs: externalEuint64 + ZK proof (Relayer SDK)
 *         - FHE types: euint64 (valuations), ebool (result)
 *         - ACL: result decryptable by both parties (+ optionally public)
 */
contract BlindBarter is SepoliaConfig {
    /* ───────── Meta ───────── */
    function version() external pure returns (string memory) {
        return "BlindBarter/1.0.1";
    }

    /* ───────── Types ───────── */
    struct Barter {
        address partyA;
        address partyB;
        uint16  tolBps;     // tolerance in basis points (e.g., 500 = 5%)
        bool    canceled;

        // encrypted valuations
        euint64 valA;
        euint64 valB;
        bool    hasA;
        bool    hasB;

        // encrypted fairness result
        ebool   fair;
        bool    hasResult;
    }

    /* ───────── Storage ───────── */
    uint256 public barterCount;
    mapping(uint256 => Barter) private _barters;

    uint16  public constant MAX_TOL_BPS = 10_000; // 100%
    uint64  public constant ONE_BPS     = 10_000; // scale for bps math

    /* ───────── Events ───────── */
    event BarterCreated(uint256 indexed id, address indexed partyA, address indexed partyB, uint16 tolBps);
    event ValuationSubmitted(uint256 indexed id, address indexed party);
    event FairnessComputed(uint256 indexed id, bytes32 resultHandle);
    event BarterCanceled(uint256 indexed id);

    /* ───────── Modifiers ───────── */
    modifier onlyParticipant(uint256 id) {
        Barter storage b = _barters[id];
        require(!b.canceled, "barter canceled");
        require(b.partyA != address(0) && b.partyB != address(0), "no such barter");
        require(msg.sender == b.partyA || msg.sender == b.partyB, "not a participant");
        _;
    }

    /* ───────── API ───────── */

    /**
     * @notice Create a new blind barter session with a counterparty and tolerance (bps).
     * @param counterparty The other address
     * @param tolBps       Tolerance in basis points (0..10000)
     * @return id          New barter id
     */
    function createBarter(address counterparty, uint16 tolBps) external returns (uint256 id) {
        require(counterparty != address(0) && counterparty != msg.sender, "bad counterparty");
        require(tolBps <= MAX_TOL_BPS, "tol too high");

        id = ++barterCount;
        Barter storage b = _barters[id];
        b.partyA  = msg.sender;
        b.partyB  = counterparty;
        b.tolBps  = tolBps;

        emit BarterCreated(id, b.partyA, b.partyB, tolBps);
    }

    /**
     * @notice Submit your encrypted valuation for a barter.
     * @dev Can be called by either party, at most once before fairness is computed.
     *      Re-submission before result is allowed — last write wins.
     */
    function submitValuation(
        uint256 id,
        externalEuint64 valExt,
        bytes calldata proof
    ) external onlyParticipant(id)
    {
        require(proof.length > 0, "empty proof");
        Barter storage b = _barters[id];
        require(!b.hasResult, "result already computed");

        euint64 v = FHE.fromExternal(valExt, proof);
        _ingestValuation(b, msg.sender, v);

        emit ValuationSubmitted(id, msg.sender);
    }

    /**
     * @notice Compute encrypted fairness result once both valuations are present.
     * @return fairCt ebool ciphertext of fairness (1=fair, 0=not fair)
     */
    function computeFairness(uint256 id) public onlyParticipant(id) returns (ebool fairCt) {
        Barter storage b = _barters[id];
        require(!b.hasResult, "result already computed");
        require(b.hasA && b.hasB, "both valuations required");

        // min/max
        ebool a_lt_b = FHE.lt(b.valA, b.valB);
        euint64 minV = FHE.select(a_lt_b, b.valA, b.valB);
        euint64 maxV = FHE.select(a_lt_b, b.valB, b.valA);

        // max * 10_000 <= min * (10_000 + tolBps)
        euint64 lhs = FHE.mul(maxV, FHE.asEuint64(ONE_BPS));                      // max * 10000
        euint64 rhs = FHE.mul(minV, FHE.asEuint64(ONE_BPS + uint64(b.tolBps)));   // min * (10000 + tol)

        ebool fair = FHE.le(lhs, rhs);

        // ACL: both parties can decrypt; optionally make public for easy UI
        FHE.allow(fair, b.partyA);
        FHE.allow(fair, b.partyB);
        FHE.makePubliclyDecryptable(fair);

        // persist + allow contract to reuse if needed
        b.fair = fair;
        b.hasResult = true;
        FHE.allowThis(b.fair);

        emit FairnessComputed(id, FHE.toBytes32(fair));
        return fair;
    }

    /**
     * @notice Convenience: submit the valuation and compute fairness if possible.
     * @return fairCt ebool result if computed, otherwise zero-handle (no both valuations yet)
     */
    function submitAndCompute(
        uint256 id,
        externalEuint64 valExt,
        bytes calldata proof
    ) external onlyParticipant(id) returns (ebool fairCt)
    {
        require(proof.length > 0, "empty proof");
        Barter storage b = _barters[id];
        require(!b.hasResult, "result already computed");

        // decode and ingest (internal helper; avoids external self-call)
        euint64 v = FHE.fromExternal(valExt, proof);
        _ingestValuation(b, msg.sender, v);
        emit ValuationSubmitted(id, msg.sender);

        if (!b.hasResult && b.hasA && b.hasB) {
            return computeFairness(id);
        }
        // not enough inputs yet; return current (unset) result
        return b.fair;
    }

    /**
     * @notice Cancel an open barter before result is computed (either party).
     */
    function cancel(uint256 id) external onlyParticipant(id) {
        Barter storage b = _barters[id];
        require(!b.hasResult, "result already computed");
        b.canceled = true;
        emit BarterCanceled(id);
    }

    /* ───────── Views (no FHE ops) ───────── */

    function getBarterInfo(uint256 id)
        external
        view
        returns (
            address partyA,
            address partyB,
            uint16  tolBps,
            bool    hasA,
            bool    hasB,
            bool    hasResult,
            bool    canceled
        )
    {
        Barter storage b = _barters[id];
        return (b.partyA, b.partyB, b.tolBps, b.hasA, b.hasB, b.hasResult, b.canceled);
    }

    /// @notice Handle to encrypted result (anyone can read the handle; only parties/public can decrypt per ACL).
    function getResultHandle(uint256 id) external view returns (bytes32) {
        Barter storage b = _barters[id];
        require(b.hasResult, "no result");
        return FHE.toBytes32(b.fair);
    }

    /* ───────── Internal helpers (no external self-calls) ───────── */

    /// @dev Store valuation from sender and keep ACL for future tx usage.
    function _ingestValuation(Barter storage b, address sender, euint64 v) internal {
        if (sender == b.partyA) {
            b.valA = v;
            b.hasA = true;
            FHE.allowThis(b.valA); // reuse across txs
        } else if (sender == b.partyB) {
            b.valB = v;
            b.hasB = true;
            FHE.allowThis(b.valB);
        } else {
            revert("not a participant");
        }
    }
}
