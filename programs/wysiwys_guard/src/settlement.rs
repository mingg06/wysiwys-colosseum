use anchor_lang::prelude::*;
use crate::{constants::*, errors::GuardError, logic, state::SettlementOrder};

struct Reader<'a> { data: &'a [u8], pos: usize }
impl<'a> Reader<'a> {
    fn take(&mut self, n: usize) -> Result<&'a [u8]> {
        let end = self.pos.checked_add(n).ok_or_else(|| error!(GuardError::SettlementMismatch))?;
        let out = self.data.get(self.pos..end).ok_or_else(|| error!(GuardError::SettlementMismatch))?;
        self.pos = end;
        Ok(out)
    }
    fn byte(&mut self) -> Result<u8> { Ok(self.take(1)?[0]) }
    fn len(&mut self) -> Result<usize> { Ok(u32::from_le_bytes(self.take(4)?.try_into().unwrap()) as usize) }
    fn key(&mut self) -> Result<Pubkey> { Ok(Pubkey::new_from_array(self.take(32)?.try_into().unwrap())) }
}

pub struct Payment {
    pub vault: Pubkey, pub source: Pubkey, pub destination: Pubkey, pub mint: Pubkey,
    pub kind: u8, pub amount: u64, pub decimals: u8,
}

/// Bounded parsing of the canonical stored Squads message, independent of the CRE verdict.
pub fn parse_payment(data: &[u8], multisig: &Pubkey) -> Result<Payment> {
    let header = logic::parse_vault_transaction(data)?;
    require_keys_eq!(header.multisig, *multisig, GuardError::SettlementMismatch);
    require!(data.len() >= 83, GuardError::SettlementMismatch);
    let vault = Pubkey::find_program_address(&[b"multisig", multisig.as_ref(), b"vault", &[data[81]]], &SQUADS_PROGRAM_ID).0;
    let mut r = Reader { data, pos: 83 };
    require!(r.len()? == 0, GuardError::SettlementMismatch); // no ephemeral signers
    let signers = r.byte()?; let writable_signers = r.byte()?; let writable_non = r.byte()?;
    require!(signers == 1 && writable_signers <= 1, GuardError::SettlementMismatch);
    let n = r.len()?;
    require!(n == 3 || n == 5, GuardError::SettlementMismatch);
    let mut keys = Vec::with_capacity(n);
    for _ in 0..n { keys.push(r.key()?); }
    require!(keys[0] == vault && writable_non as usize <= n - 1, GuardError::SettlementMismatch);
    for i in 0..n { require!(!keys[..i].contains(&keys[i]), GuardError::SettlementMismatch); }
    require!(r.len()? == 1, GuardError::SettlementMismatch);
    let pi = r.byte()? as usize;
    require!(pi < n, GuardError::SettlementMismatch);
    let count = r.len()?;
    require!(count == 2 || count == 4, GuardError::SettlementMismatch);
    let indexes = r.take(count)?.to_vec();
    require!(indexes.iter().all(|i| (*i as usize) < n), GuardError::SettlementMismatch);
    for i in 0..indexes.len() { require!(!indexes[..i].contains(&indexes[i]) && indexes[i] as usize != pi, GuardError::SettlementMismatch); }
    let len = r.len()?; let ix = r.take(len)?;
    require!(r.len()? == 0 && r.pos == data.len(), GuardError::SettlementMismatch);
    let k = |i: usize| keys[indexes[i] as usize];
    let writable = |i: usize| if i == 0 { writable_signers == 1 } else { i < 1 + writable_non as usize };
    require!(!writable(pi) && pi != 0, GuardError::SettlementMismatch);
    if keys[pi] == anchor_lang::solana_program::system_program::ID {
        require!(n == 3 && count == 2 && ix.len() == 12 && ix[..4] == [2, 0, 0, 0], GuardError::SettlementMismatch);
        require!(k(0) == vault && writable(indexes[0] as usize) && writable(indexes[1] as usize) && k(1) != vault, GuardError::SettlementMismatch);
        Ok(Payment { vault, source: vault, destination: k(1), mint: Pubkey::default(), kind: ACTION_SOL, amount: u64::from_le_bytes(ix[4..12].try_into().unwrap()), decimals: 9 })
    } else {
        require!(keys[pi] == SPL_TOKEN_PROGRAM_ID && n == 5 && count == 4 && ix.len() == 10 && ix[0] == 12, GuardError::SettlementMismatch);
        require!(k(3) == vault && writable(indexes[0] as usize) && writable(indexes[2] as usize) && !writable(indexes[1] as usize), GuardError::SettlementMismatch);
        require!(k(0) != k(2) && k(0) != vault && k(2) != vault && k(1) != vault && k(1) != keys[pi], GuardError::SettlementMismatch);
        Ok(Payment { vault, source: k(0), destination: k(2), mint: k(1), kind: ACTION_SPL, amount: u64::from_le_bytes(ix[1..9].try_into().unwrap()), decimals: ix[9] })
    }
}

pub fn check_authority(authority: &Pubkey, multisig_data: &[u8], executor: &Pubkey) -> Result<()> {
    let ms = logic::parse_multisig(multisig_data)?;
    logic::check_sole_executor(&ms, executor)?;
    require!(*authority != Pubkey::default() && *authority != *executor && !ms.members.iter().any(|(key, _)| key == authority), GuardError::InvalidSettlementAuthority);
    Ok(())
}

pub fn check_order(order: &SettlementOrder, p: &Payment, recipient: &Pubkey, now: i64) -> Result<()> {
    require!(!order.consumed, GuardError::SettlementAlreadyConsumed);
    require!(now < order.expires_at, GuardError::SettlementExpired);
    require!(order.allowed_vaults.contains(&p.vault) && order.action_kind == p.kind && order.destination == p.destination && order.recipient == *recipient && order.mint == p.mint && order.amount == p.amount && order.decimals == p.decimals, GuardError::SettlementMismatch);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sol_message(amount: u64) -> (Vec<u8>, Pubkey, Pubkey) {
        let ms = Pubkey::new_unique();
        let recipient = Pubkey::new_unique();
        let vault = Pubkey::find_program_address(&[b"multisig", ms.as_ref(), b"vault", &[0]], &SQUADS_PROGRAM_ID).0;
        let mut d = VAULT_TRANSACTION_DISCRIMINATOR.to_vec();
        d.extend_from_slice(ms.as_ref());
        d.extend_from_slice(Pubkey::new_unique().as_ref());
        d.extend_from_slice(&1u64.to_le_bytes());
        d.extend_from_slice(&[255, 0, 255]);
        d.extend_from_slice(&0u32.to_le_bytes());
        d.extend_from_slice(&[1, 1, 1]);
        d.extend_from_slice(&3u32.to_le_bytes());
        for k in [vault, recipient, anchor_lang::solana_program::system_program::ID] { d.extend_from_slice(k.as_ref()); }
        d.extend_from_slice(&1u32.to_le_bytes());
        d.push(2);
        d.extend_from_slice(&2u32.to_le_bytes());
        d.extend_from_slice(&[0, 1]);
        d.extend_from_slice(&12u32.to_le_bytes());
        d.extend_from_slice(&2u32.to_le_bytes());
        d.extend_from_slice(&amount.to_le_bytes());
        d.extend_from_slice(&0u32.to_le_bytes());
        (d, ms, recipient)
    }

    #[test]
    fn decodes_exact_sol_amount_and_derived_source_vault() {
        let (d, ms, recipient) = sol_message(101);
        let p = parse_payment(&d, &ms).unwrap();
        assert_eq!((p.amount, p.destination, p.kind, p.decimals), (101, recipient, ACTION_SOL, 9));
        for len in 0..d.len() { assert!(parse_payment(&d[..len], &ms).is_err(), "length {len}"); }
        assert!(parse_payment(&d, &Pubkey::new_unique()).is_err());
    }

    #[test]
    fn rejects_hidden_instructions_lookups_and_wrong_privileges() {
        let (d, ms, _) = sol_message(101);
        for (offset, value) in [(83, 1), (87, 2), (88, 0), (89, 0), (190, 2)] {
            let mut bad = d.clone(); bad[offset] = value;
            assert!(parse_payment(&bad, &ms).is_err(), "offset {offset}");
        }
        let mut bad = d.clone(); let last = bad.len() - 4; bad[last] = 1;
        assert!(parse_payment(&bad, &ms).is_err());
    }
}
