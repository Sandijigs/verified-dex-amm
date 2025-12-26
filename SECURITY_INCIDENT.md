# Security Incident Report

## ⚠️ CRITICAL: Exposed Seed Phrase

**Date:** December 26, 2025
**Severity:** CRITICAL
**Status:** MITIGATED (Partial)

---

## Incident Summary

A 24-word seed phrase was accidentally committed to the git repository in the `.env` file. This seed phrase was exposed in the public git history from commit `8ddc5f4` onwards.

**Exposed Wallet:**
- **Address:** `ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV`
- **Network:** Testnet
- **Exposure Duration:** December 23, 2025 - December 26, 2025

---

## Actions Taken

### ✅ Immediate Remediation (Completed)

1. **Sanitized .env file** - Removed actual seed phrase, replaced with placeholder
2. **Updated .gitignore** - Added `.env` and related files to prevent future commits
3. **Rewrote git history** - Used `git filter-branch` to remove `.env` from all commits
4. **Created security commit** - Documented the removal in commit `959de93`

### ⚠️ Required Actions (MUST DO)

1. **🚨 DO NOT USE THIS WALLET FOR MAINNET** - Consider it permanently compromised
2. **Generate new wallet** for any production/mainnet use
3. **Force push to remote** to update public repository:
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```
4. **Transfer any testnet STX** from `ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV` to a new wallet
5. **Update deployment address** in all configuration files

---

## Impact Assessment

### Testnet Exposure
- ✅ **Low Risk** - This is a testnet wallet with no real value
- Phase 1 contracts were deployed using this wallet (vdex-token, sbtc-pool)
- Testnet STX has no monetary value

### Mainnet Exposure
- ✅ **No Exposure** - Wallet was never funded on mainnet
- No mainnet transactions from this address

### Repository Exposure
- ⚠️ **Public Repository** - If this repo was pushed to GitHub/GitLab, the seed phrase was publicly visible
- Anyone who cloned the repo before history rewrite still has the seed phrase in their local copy
- Git history on remote servers may still contain the seed phrase until force-pushed

---

## Lessons Learned

1. **Never commit `.env` files** - Always include in `.gitignore` from project start
2. **Use `.env.example`** - Provide template files without sensitive data
3. **Separate secrets** - Use dedicated secret management for production
4. **Pre-commit hooks** - Add git hooks to prevent committing sensitive files
5. **Regular audits** - Scan for accidentally committed secrets

---

## Remediation Checklist

- [x] Remove seed phrase from current `.env` file
- [x] Add `.env` to `.gitignore`
- [x] Rewrite git history to remove `.env`
- [x] Document incident in SECURITY_INCIDENT.md
- [ ] **Force push to remote repository** (YOU MUST DO THIS)
- [ ] Generate new wallet for future deployments
- [ ] Update all documentation with new wallet address
- [ ] Scan for any other exposed secrets in git history

---

## Commands to Complete Remediation

### 1. Force Push to Remote (REQUIRED)
```bash
# This will overwrite remote history - make sure team is aware
git push origin --force --all
git push origin --force --tags
```

### 2. Generate New Wallet
```bash
# Using Stacks CLI
stx make_keychain -t

# Or use a hardware wallet for production
```

### 3. Clean Up Local Git References
```bash
# Remove backup references created by filter-branch
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

---

## Prevention Measures

### Update Pre-commit Hook
Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
# Prevent committing .env files
if git diff --cached --name-only | grep -q "^.env$"; then
    echo "ERROR: Attempting to commit .env file!"
    echo "This file contains sensitive data and should not be committed."
    exit 1
fi
```

### Use .env.example Template
Create `.env.example`:
```bash
NETWORK=testnet
MNEMONIC=your-24-word-seed-phrase-here
DEPLOYER_ADDRESS=your-stacks-address-here
```

---

## Contact

If you have any questions about this incident or need assistance:
- Review git history: `git log --all --oneline -- .env`
- Check for secrets: `git log --all --full-history --source -S "MNEMONIC"`

---

**Remember:** The exposed wallet `ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV` should be considered compromised and NEVER used for mainnet or any real value transactions.
