use anchor_lang::prelude::*;
use crate::{constants::*, errors::GuardError, settlement, state::{GuardConfig, SettlementBinding, SettlementOrder}};

#[derive(Accounts)]
pub struct InitializeSettlementBinding<'info> {
    #[account(seeds = [CONFIG_SEED, multisig.key().as_ref()], bump = config.bump, has_one = multisig)]
    pub config: Account<'info, GuardConfig>,
    /// CHECK: owner, create key, fresh transaction index and sole executor checked below.
    #[account(owner = SQUADS_PROGRAM_ID @ GuardError::NotSquadsAccount)]
    pub multisig: UncheckedAccount<'info>,
    pub create_key: Signer<'info>,
    #[account(init, payer = payer, space = 8 + SettlementBinding::INIT_SPACE, seeds = [SETTLEMENT_BINDING_SEED, multisig.key().as_ref()], bump)]
    pub settlement_binding: Account<'info, SettlementBinding>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_initialize_settlement_binding(ctx: Context<InitializeSettlementBinding>, authority: Pubkey) -> Result<()> {
    let ms = ctx.accounts.multisig.key();
    let expected = Pubkey::find_program_address(&[b"multisig", b"multisig", ctx.accounts.create_key.key().as_ref()], &SQUADS_PROGRAM_ID).0;
    require_keys_eq!(expected, ms, GuardError::WrongMultisig);
    let data = ctx.accounts.multisig.try_borrow_data()?;
    require!(data.len() >= 86 && data[78..86] == [0; 8], GuardError::InvalidSettlementBinding);
    let executor = Pubkey::find_program_address(&[EXECUTOR_SEED, ms.as_ref()], &crate::ID).0;
    settlement::check_authority(&authority, &data, &executor)?;
    let b = &mut ctx.accounts.settlement_binding;
    b.multisig = ms; b.authority = authority; b.bump = ctx.bumps.settlement_binding;
    Ok(())
}

#[derive(Accounts)]
#[instruction(order_id: [u8; 32])]
pub struct AuthorizeSettlementOrder<'info> {
    pub authority: Signer<'info>,
    #[account(init, payer = payer, space = 8 + SettlementOrder::INIT_SPACE, seeds = [SETTLEMENT_ORDER_SEED, authority.key().as_ref(), order_id.as_ref()], bump)]
    pub settlement_order: Account<'info, SettlementOrder>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_authorize_settlement_order(ctx: Context<AuthorizeSettlementOrder>, order_id: [u8; 32], allowed_vaults: Vec<Pubkey>, action_kind: u8, destination: Pubkey, recipient: Pubkey, mint: Pubkey, amount: u64, decimals: u8, expires_at: i64) -> Result<()> {
    require!(allowed_vaults.len() > 0 && allowed_vaults.len() <= MAX_SETTLEMENT_VAULTS && amount > 0 && expires_at > Clock::get()?.unix_timestamp && decimals <= 9, GuardError::InvalidSettlementOrder);
    for (i, key) in allowed_vaults.iter().enumerate() { require!(*key != Pubkey::default() && !allowed_vaults[..i].contains(key), GuardError::InvalidSettlementOrder); }
    require!(destination != Pubkey::default() && recipient != Pubkey::default(), GuardError::InvalidSettlementOrder);
    require!((action_kind == ACTION_SOL && destination == recipient && mint == Pubkey::default() && decimals == 9) || (action_kind == ACTION_SPL && mint != Pubkey::default()), GuardError::InvalidSettlementOrder);
    let o = &mut ctx.accounts.settlement_order;
    o.authority = ctx.accounts.authority.key(); o.order_id = order_id; o.allowed_vaults = allowed_vaults;
    o.action_kind = action_kind; o.destination = destination; o.recipient = recipient; o.mint = mint;
    o.amount = amount; o.decimals = decimals; o.expires_at = expires_at; o.consumed = false;
    o.settled_multisig = Pubkey::default(); o.settled_tx_index = 0; o.settled_tx_hash = [0; 32]; o.settled_at = 0; o.bump = ctx.bumps.settlement_order;
    emit!(crate::events::SettlementOrderAuthorized { order: o.key(), authority: o.authority, order_id });
    Ok(())
}
