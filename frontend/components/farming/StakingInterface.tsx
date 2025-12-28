import React, { useState } from 'react';
import { useLpStaking } from '../../hooks/useLpStaking';
import { useWalletConnect } from '../../hooks/useWalletConnect';

export const StakingInterface: React.FC = () => {
  const { connected } = useWalletConnect();
  const {
    stakeInfo,
    pendingRewards,
    totalStaked,
    isInitialized,
    loading,
    apr,
    registerStake,
    unregisterStake,
    claimRewards,
  } = useLpStaking();

  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleStake = async () => {
    setError('');
    setSuccess('');

    const amount = parseFloat(stakeAmount);

    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setActionLoading(true);
      const txId = await registerStake(amount);
      setSuccess(`Stake registered! TX ID: ${txId}`);
      setStakeAmount('');
    } catch (err: any) {
      setError(err.message || 'Failed to stake');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnstake = async () => {
    setError('');
    setSuccess('');

    const amount = parseFloat(unstakeAmount);

    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!stakeInfo || amount > stakeInfo.amount) {
      setError('Insufficient staked balance');
      return;
    }

    try {
      setActionLoading(true);
      const txId = await unregisterStake(amount);
      setSuccess(`Stake unregistered! TX ID: ${txId}`);
      setUnstakeAmount('');
    } catch (err: any) {
      setError(err.message || 'Failed to unstake');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClaim = async () => {
    setError('');
    setSuccess('');

    if (!pendingRewards || pendingRewards === 0) {
      setError('No rewards to claim');
      return;
    }

    try {
      setActionLoading(true);
      const txId = await claimRewards();
      setSuccess(`Rewards claimed! TX ID: ${txId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to claim rewards');
    } finally {
      setActionLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="staking-interface">
        <h3>LP Staking</h3>
        <p>Connect your wallet to start staking</p>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="staking-interface">
        <h3>LP Staking</h3>
        <p>Staking is not initialized yet</p>
      </div>
    );
  }

  return (
    <div className="staking-interface">
      <h3>LP Staking</h3>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Staked</span>
          <span className="stat-value">{totalStaked.toLocaleString()}</span>
          <span className="stat-unit">LP Tokens</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">APR</span>
          <span className="stat-value apr">{apr.toFixed(2)}%</span>
          <span className="stat-unit">Annual Percentage Rate</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Your Staked</span>
          <span className="stat-value">{stakeInfo ? stakeInfo.amount.toLocaleString() : '0'}</span>
          <span className="stat-unit">LP Tokens</span>
        </div>

        <div className="stat-card highlight">
          <span className="stat-label">Pending Rewards</span>
          <span className="stat-value rewards">{pendingRewards.toFixed(6)}</span>
          <span className="stat-unit">VDEX</span>
        </div>
      </div>

      <div className="rewards-section">
        <div className="rewards-info">
          <div className="rewards-display">
            <span className="rewards-label">Claimable Rewards</span>
            <span className="rewards-amount">{pendingRewards.toFixed(6)} VDEX</span>
          </div>
          <button
            className="claim-button"
            onClick={handleClaim}
            disabled={actionLoading || !pendingRewards || pendingRewards === 0}
          >
            {actionLoading ? 'Claiming...' : 'Claim Rewards'}
          </button>
        </div>
      </div>

      <div className="staking-actions">
        <div className="action-panel">
          <h4>Stake LP Tokens</h4>
          <p className="description">
            Stake your LP tokens to earn VDEX rewards. Note: You must keep your LP tokens in your wallet.
          </p>
          <div className="input-group">
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="Amount to stake"
              disabled={actionLoading}
            />
            <button
              className="action-button stake"
              onClick={handleStake}
              disabled={actionLoading || !stakeAmount}
            >
              {actionLoading ? 'Staking...' : 'Stake'}
            </button>
          </div>
        </div>

        <div className="action-panel">
          <h4>Unstake LP Tokens</h4>
          <p className="description">
            Unregister your staked LP tokens. Your pending rewards will be claimed automatically.
          </p>
          <div className="input-group">
            <div className="input-with-max">
              <input
                type="number"
                value={unstakeAmount}
                onChange={(e) => setUnstakeAmount(e.target.value)}
                placeholder="Amount to unstake"
                disabled={actionLoading}
              />
              <button
                className="max-btn"
                onClick={() => setUnstakeAmount(stakeInfo?.amount.toString() || '0')}
              >
                MAX
              </button>
            </div>
            <button
              className="action-button unstake"
              onClick={handleUnstake}
              disabled={actionLoading || !unstakeAmount}
            >
              {actionLoading ? 'Unstaking...' : 'Unstake'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="info-panel">
        <h4>How it works</h4>
        <ul>
          <li>Register your LP tokens to start earning VDEX rewards</li>
          <li>You maintain custody of your LP tokens at all times</li>
          <li>Rewards are calculated based on your staked amount and duration</li>
          <li>Claim your rewards at any time without unstaking</li>
          <li>When you unstake, pending rewards are automatically claimed</li>
        </ul>
      </div>

      <style jsx>{`
        .staking-interface {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
          max-width: 800px;
        }

        .staking-interface h3 {
          margin: 0 0 24px 0;
          font-size: 24px;
          font-weight: 600;
          color: #111827;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .stat-card.highlight {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-color: #93c5fd;
        }

        .stat-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
          text-transform: uppercase;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
        }

        .stat-value.apr {
          color: #059669;
        }

        .stat-value.rewards {
          color: #3b82f6;
        }

        .stat-unit {
          font-size: 11px;
          color: #9ca3af;
        }

        .rewards-section {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border: 1px solid #86efac;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .rewards-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .rewards-display {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .rewards-label {
          font-size: 14px;
          color: #065f46;
          font-weight: 500;
        }

        .rewards-amount {
          font-size: 28px;
          font-weight: 700;
          color: #059669;
        }

        .claim-button {
          background: #059669;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          white-space: nowrap;
        }

        .claim-button:hover:not(:disabled) {
          background: #047857;
        }

        .claim-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .staking-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .action-panel {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
        }

        .action-panel h4 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }

        .description {
          margin: 0 0 16px 0;
          font-size: 13px;
          color: #6b7280;
          line-height: 1.5;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .input-group input {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .input-group input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .input-group input:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
        }

        .input-with-max {
          position: relative;
        }

        .input-with-max input {
          padding-right: 60px;
        }

        .max-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: #3b82f6;
          color: white;
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .max-btn:hover {
          background: #2563eb;
        }

        .action-button {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .action-button.stake {
          background: #3b82f6;
          color: white;
        }

        .action-button.stake:hover:not(:disabled) {
          background: #2563eb;
        }

        .action-button.unstake {
          background: #ef4444;
          color: white;
        }

        .action-button.unstake:hover:not(:disabled) {
          background: #dc2626;
        }

        .action-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px;
          border-radius: 6px;
          font-size: 14px;
          margin-bottom: 16px;
        }

        .success-message {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #16a34a;
          padding: 12px;
          border-radius: 6px;
          font-size: 14px;
          margin-bottom: 16px;
          word-break: break-all;
        }

        .info-panel {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 20px;
        }

        .info-panel h4 {
          margin: 0 0 12px 0;
          font-size: 16px;
          font-weight: 600;
          color: #1e40af;
        }

        .info-panel ul {
          margin: 0;
          padding-left: 20px;
          list-style-type: disc;
        }

        .info-panel li {
          margin-bottom: 8px;
          font-size: 13px;
          color: #1e40af;
          line-height: 1.5;
        }

        .info-panel li:last-child {
          margin-bottom: 0;
        }

        @media (max-width: 640px) {
          .rewards-info {
            flex-direction: column;
            align-items: stretch;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .staking-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
