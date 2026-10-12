use anchor_lang::prelude::*;

/// Immutable opt-in, created only before this multisig's first proposal.
#[account]
#[derive(InitSpace)]
pub struct SettlementBinding {
    pub multisig: Pubkey,
    pub authority: Pubkey,
    pub bump: u8,
}

/// Permanent shared obligation record. Only consumption fields can change.
#[account]
#[derive(InitSpace)]
pub struct SettlementOrder {
    pub authority: Pubkey,
    pub order_id: [u8; 32],
    #[max_len(8)]
    pub allowed_vaults: Vec<Pubkey>,
    pub action_kind: u8,
    pub destination: Pubkey,
    pub recipient: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub decimals: u8,
    pub expires_at: i64,
    pub consumed: bool,
    pub settled_multisig: Pubkey,
    pub settled_tx_index: u64,
    pub settled_tx_hash: [u8; 32],
    pub settled_at: i64,
    pub bump: u8,
}

/// Immutable after `initialize_guard`. No instruction updates it.
#[account]
#[derive(InitSpace)]
pub struct GuardConfig {
    pub multisig: Pubkey,
    pub forwarder_program: Pubkey,
    pub forwarder_state: Pubkey,
    pub policy_hash: [u8; 32],
    /// CRE workflow owner (20-byte address) whose reports this guard accepts.
    pub workflow_owner: [u8; 20],
    /// Upper bound on expires_at - issued_at of an approval, in seconds.
    pub max_review_lifetime: i64,
    /// A report must arrive within this many seconds of request_review.
    pub review_deadline_secs: i64,
    pub bump: u8,
    pub executor_bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum ReviewStatus {
    Pending,
    Approved,
    Rejected,
    Executed,
}

#[account]
#[derive(InitSpace)]
pub struct Review {
    pub version: u8,
    pub multisig: Pubkey,
    pub vault_transaction: Pubkey,
    pub proposal: Pubkey,
    pub tx_index: u64,
    pub tx_hash: [u8; 32],
    pub status: ReviewStatus,
    pub reason: u16,
    pub policy_hash: [u8; 32],
    /// Reviewed destination from the accepted report; guarded_execute recomputes it from the live account.
    pub action_kind: u8,
    pub destination_hash: [u8; 32],
    pub issued_at: i64,
    pub expires_at: i64,
    pub created_at: i64,
    pub bump: u8,
}

/// One applied policy change, keyed by the Squads transaction index that proposed it. Created once by
/// apply_policy_change (init), so the same approved proposal can never be applied twice.
#[account]
#[derive(InitSpace)]
pub struct PolicyChange {
    pub multisig: Pubkey,
    pub tx_index: u64,
    pub old_policy_hash: [u8; 32],
    pub new_policy_hash: [u8; 32],
    pub approved_at: i64,
    pub applied_at: i64,
    pub bump: u8,
}
