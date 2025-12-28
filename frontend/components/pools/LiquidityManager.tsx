import React, { useState, useEffect } from 'react';
import { useSbtcPool } from '../../hooks/useSbtcPool';
import { useWalletConnect } from '../../hooks/useWalletConnect';

type TabType = 'add' | 'remove';

export const LiquidityManager: React.FC = () => {
  const { connected } = useWalletConnect();
  const { reserves, lpBalance, loading, addLiquidity, removeLiquidity, isInitialized } = useSbtcPool();

  const [activeTab, setActiveTab] = useState<TabType>('add');
  const [stxAmount, setStxAmount] = useState('');
  const [sbtcAmount, setSbtcAmount] = useState('');
  const [lpAmount, setLpAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Calculate proportional amounts for adding liquidity
  useEffect(() => {
    if (activeTab === 'add' && reserves.stx > 0 && reserves.sbtc > 0) {
      const stx = parseFloat(stxAmount);
      if (!isNaN(stx) && stx > 0) {
        const proportionalSbtc = (stx * reserves.sbtc) / reserves.stx;
        setSbtcAmount(proportionalSbtc.toFixed(8));
      }
    }
  }, [stxAmount, activeTab, reserves]);

  useEffect(() => {
    if (activeTab === 'add' && reserves.stx > 0 && reserves.sbtc > 0) {
      const sbtc = parseFloat(sbtcAmount);
      if (!isNaN(sbtc) && sbtc > 0) {
        const proportionalStx = (sbtc * reserves.stx) / reserves.sbtc;
        setStxAmount(proportionalStx.toFixed(6));
      }
    }
  }, [sbtcAmount, activeTab, reserves]);

  // Calculate estimated token amounts when removing liquidity
  const getRemovalEstimates = (): { stx: number; sbtc: number } => {
    const lp = parseFloat(lpAmount);
    if (isNaN(lp) || lp <= 0 || reserves.lpSupply === 0) {
      return { stx: 0, sbtc: 0 };
    }

    const sharePercent = lp / reserves.lpSupply;
    return {
      stx: reserves.stx * sharePercent,
      sbtc: reserves.sbtc * sharePercent,
    };
  };

  const handleAddLiquidity = async () => {
    setError('');
    setSuccess('');

    const stx = parseFloat(stxAmount);
    const sbtc = parseFloat(sbtcAmount);

    if (isNaN(stx) || stx <= 0 || isNaN(sbtc) || sbtc <= 0) {
      setError('Please enter valid amounts');
      return;
    }

    try {
      setActionLoading(true);
      const txId = await addLiquidity(stx, sbtc, 0);
      setSuccess(`Liquidity added! TX ID: ${txId}`);
      setStxAmount('');
      setSbtcAmount('');
    } catch (err: any) {
      setError(err.message || 'Failed to add liquidity');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveLiquidity = async () => {
    setError('');
    setSuccess('');

    const lp = parseFloat(lpAmount);

    if (isNaN(lp) || lp <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (lp > lpBalance) {
      setError('Insufficient LP token balance');
      return;
    }

    try {
      setActionLoading(true);
      const txId = await removeLiquidity(lp, 0, 0);
      setSuccess(`Liquidity removed! TX ID: ${txId}`);
      setLpAmount('');
    } catch (err: any) {
      setError(err.message || 'Failed to remove liquidity');
    } finally {
      setActionLoading(false);
    }
  };

  const getPoolShare = (): string => {
    if (reserves.lpSupply === 0 || lpBalance === 0) return '0';
    return ((lpBalance / reserves.lpSupply) * 100).toFixed(4);
  };

  if (!connected) {
    return (
      <div className="liquidity-manager">
        <h3>Liquidity</h3>
        <p>Connect your wallet to manage liquidity</p>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="liquidity-manager">
        <h3>Liquidity</h3>
        <p>Pool is not initialized yet</p>
      </div>
    );
  }

  const removalEstimates = getRemovalEstimates();

  return (
    <div className="liquidity-manager">
      <h3>Liquidity</h3>

      <div className="pool-stats">
        <div className="stat-item">
          <span className="stat-label">STX Reserve</span>
          <span className="stat-value">{reserves.stx.toLocaleString()} STX</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">sBTC Reserve</span>
          <span className="stat-value">{reserves.sbtc.toFixed(8)} sBTC</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Your LP Tokens</span>
          <span className="stat-value">{lpBalance.toLocaleString()}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Your Pool Share</span>
          <span className="stat-value">{getPoolShare()}%</span>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          Add Liquidity
        </button>
        <button
          className={`tab ${activeTab === 'remove' ? 'active' : ''}`}
          onClick={() => setActiveTab('remove')}
        >
          Remove Liquidity
        </button>
      </div>

      {activeTab === 'add' ? (
        <div className="liquidity-form">
          <div className="form-group">
            <div className="input-header">
              <label>STX Amount</label>
              <span className="balance">Reserve: {reserves.stx.toFixed(2)}</span>
            </div>
            <input
              type="number"
              step="0.000001"
              value={stxAmount}
              onChange={(e) => setStxAmount(e.target.value)}
              placeholder="0.00"
              disabled={actionLoading}
            />
          </div>

          <div className="plus-icon">+</div>

          <div className="form-group">
            <div className="input-header">
              <label>sBTC Amount</label>
              <span className="balance">Reserve: {reserves.sbtc.toFixed(8)}</span>
            </div>
            <input
              type="number"
              step="0.00000001"
              value={sbtcAmount}
              onChange={(e) => setSbtcAmount(e.target.value)}
              placeholder="0.00000000"
              disabled={actionLoading}
            />
          </div>

          {stxAmount && sbtcAmount && (
            <div className="info-box">
              <p>You will receive LP tokens proportional to your share of the pool.</p>
              <p>Current ratio: 1 STX = {(reserves.sbtc / reserves.stx).toFixed(8)} sBTC</p>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button
            className="action-button"
            onClick={handleAddLiquidity}
            disabled={actionLoading || !stxAmount || !sbtcAmount}
          >
            {actionLoading ? 'Adding Liquidity...' : 'Add Liquidity'}
          </button>
        </div>
      ) : (
        <div className="liquidity-form">
          <div className="form-group">
            <div className="input-header">
              <label>LP Token Amount</label>
              <span className="balance">Balance: {lpBalance.toLocaleString()}</span>
            </div>
            <div className="input-with-max">
              <input
                type="number"
                value={lpAmount}
                onChange={(e) => setLpAmount(e.target.value)}
                placeholder="0"
                disabled={actionLoading}
              />
              <button
                className="max-button"
                onClick={() => setLpAmount(lpBalance.toString())}
              >
                MAX
              </button>
            </div>
          </div>

          {lpAmount && parseFloat(lpAmount) > 0 && (
            <div className="removal-preview">
              <p className="preview-title">You will receive:</p>
              <div className="preview-item">
                <span>STX:</span>
                <span>{removalEstimates.stx.toFixed(6)}</span>
              </div>
              <div className="preview-item">
                <span>sBTC:</span>
                <span>{removalEstimates.sbtc.toFixed(8)}</span>
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button
            className="action-button remove"
            onClick={handleRemoveLiquidity}
            disabled={actionLoading || !lpAmount}
          >
            {actionLoading ? 'Removing Liquidity...' : 'Remove Liquidity'}
          </button>
        </div>
      )}

      <style jsx>{`
        .liquidity-manager {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
          max-width: 600px;
        }

        .liquidity-manager h3 {
          margin: 0 0 20px 0;
          font-size: 20px;
          font-weight: 600;
          color: #111827;
        }

        .pool-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 24px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
        }

        .stat-value {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }

        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          background: #f3f4f6;
          padding: 4px;
          border-radius: 8px;
        }

        .tab {
          flex: 1;
          padding: 10px;
          border: none;
          background: transparent;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab.active {
          background: white;
          color: #3b82f6;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .liquidity-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .input-header label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .input-header .balance {
          font-size: 12px;
          color: #9ca3af;
        }

        .form-group input {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .form-group input:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
        }

        .input-with-max {
          position: relative;
        }

        .input-with-max input {
          padding-right: 70px;
        }

        .max-button {
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

        .max-button:hover {
          background: #2563eb;
        }

        .plus-icon {
          text-align: center;
          color: #9ca3af;
          font-size: 20px;
          font-weight: 600;
        }

        .info-box {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 12px;
          font-size: 13px;
          color: #1e40af;
        }

        .info-box p {
          margin: 0 0 6px 0;
        }

        .info-box p:last-child {
          margin: 0;
        }

        .removal-preview {
          background: #f9fafb;
          border-radius: 8px;
          padding: 16px;
        }

        .preview-title {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .preview-item {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          margin-bottom: 8px;
          color: #6b7280;
        }

        .preview-item:last-child {
          margin-bottom: 0;
        }

        .preview-item span:last-child {
          font-weight: 600;
          color: #111827;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 10px 12px;
          border-radius: 6px;
          font-size: 14px;
        }

        .success-message {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #16a34a;
          padding: 10px 12px;
          border-radius: 6px;
          font-size: 14px;
          word-break: break-all;
        }

        .action-button {
          width: 100%;
          background: #3b82f6;
          color: white;
          padding: 14px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .action-button:hover:not(:disabled) {
          background: #2563eb;
        }

        .action-button.remove {
          background: #ef4444;
        }

        .action-button.remove:hover:not(:disabled) {
          background: #dc2626;
        }

        .action-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
