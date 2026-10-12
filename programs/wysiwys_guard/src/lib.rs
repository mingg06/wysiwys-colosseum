use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod logic;
pub mod state;
pub mod settlement;

pub use instructions::*;

declare_id!("9wCcjb74o2cWcFx8GimQQMcR1nJay9X86v1JiyV9kwya");

#[program]
pub mod wysiwys_guard {
    use super::*;

    pub fn initialize_guard(
        ctx: Context<InitializeGuard>,
        forwarder_program: Pubkey,
        forwarder_state: Pubkey,
        policy_hash: [u8; 32],
        workflow_owner: [u8; 20],
        max_review_lifetime: i64,
        review_deadline_secs: i64,
    ) -> Result<()> {
        instructions::initialize_guard::handle_initialize_guard(
            ctx,
            forwarder_program,
            forwarder_state,
            policy_hash,
            workflow_owner,
            max_review_lifetime,
            review_deadline_secs,
        )
    }

    pub fn request_review(ctx: Context<RequestReview>) -> Result<()> {
        instructions::request_review::handle_request_review(ctx)
    }

    pub fn initialize_settlement_binding(ctx: Context<InitializeSettlementBinding>, authority: Pubkey) -> Result<()> {
        instructions::settlement_orders::handle_initialize_settlement_binding(ctx, authority)
    }

    pub fn authorize_settlement_order(ctx: Context<AuthorizeSettlementOrder>, order_id: [u8; 32], allowed_vaults: Vec<Pubkey>, action_kind: u8, destination: Pubkey, recipient: Pubkey, mint: Pubkey, amount: u64, decimals: u8, expires_at: i64) -> Result<()> {
        instructions::settlement_orders::handle_authorize_settlement_order(ctx, order_id, allowed_vaults, action_kind, destination, recipient, mint, amount, decimals, expires_at)
    }

    pub fn on_report(ctx: Context<OnReport>, metadata: Vec<u8>, report: Vec<u8>) -> Result<()> {
        instructions::on_report::handle_on_report(ctx, metadata, report)
    }

    pub fn guarded_execute<'info>(ctx: Context<'info, GuardedExecute<'info>>) -> Result<()> {
        instructions::guarded_execute::handle_guarded_execute(ctx)
    }

    pub fn guarded_config_execute(ctx: Context<GuardedConfigExecute>) -> Result<()> {
        instructions::guarded_config_execute::handle_guarded_config_execute(ctx)
    }

    pub fn apply_policy_change(ctx: Context<ApplyPolicyChange>) -> Result<()> {
        instructions::apply_policy_change::handle_apply_policy_change(ctx)
    }
}
