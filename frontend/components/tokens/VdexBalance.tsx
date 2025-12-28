import React, { useState } from 'react';
import { useVdexToken } from '../../hooks/useVdexToken';
import { useWalletConnect } from '../../hooks/useWalletConnect';

export const VdexBalance: React.FC = () => {
  const { connected, address } = useWalletConnect();
  const { balance, loading, transfer, contractId } = useVdexToken();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!recipient || !amount) {
      setError('Please fill in all fields');
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (transferAmount > balance) {
      setError('Insufficient balance');
      return;
    }

    try {
      setTransferLoading(true);
      const txId = await transfer(transferAmount, recipient);
      setSuccess(`Transfer submitted! TX ID: ${txId}`);
      setRecipient('');
      setAmount('');
    } catch (err: any) {
      setError(err.message || 'Transfer failed');
    } finally {
      setTransferLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="vdex-balance-card">
        <h3>VDEX Token</h3>
        <p>Connect your wallet to view your VDEX balance</p>
      </div>
    );
  }

  return (
    <div className="vdex-balance-card">
      <div className="balance-header">
        <h3>VDEX Token</h3>
        <span className="contract-id" title={contractId}>
          {contractId?.slice(0, 20)}...
        </span>
      </div>

      <div className="balance-display">
        <div className="balance-amount">
          <span className="label">Your Balance:</span>
          <span className="amount">
            {loading ? '...' : balance.toLocaleString()} VDEX
          </span>
        </div>
        <div className="wallet-address">
          <span className="label">Address:</span>
          <span className="address" title={address}>
            {address?.slice(0, 10)}...{address?.slice(-6)}
          </span>
        </div>
      </div>

      <div className="transfer-form">
        <h4>Transfer VDEX</h4>
        <form onSubmit={handleTransfer}>
          <div className="form-group">
            <label htmlFor="recipient">Recipient Address</label>
            <input
              id="recipient"
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="ST1WPQWDNG2H8VMG93PW3JM74SGXVTA38ETGZ64F8"
              disabled={transferLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount</label>
            <input
              id="amount"
              type="number"
              step="0.000001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={transferLoading}
            />
            <span className="max-button" onClick={() => setAmount(balance.toString())}>
              MAX
            </span>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button
            type="submit"
            className="transfer-button"
            disabled={transferLoading || !recipient || !amount}
          >
            {transferLoading ? 'Transferring...' : 'Transfer'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .vdex-balance-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
          max-width: 500px;
        }

        .balance-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .balance-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #111827;
        }

        .contract-id {
          font-size: 12px;
          color: #6b7280;
          font-family: monospace;
        }

        .balance-display {
          background: #f9fafb;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .balance-amount {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .balance-amount .amount {
          font-size: 24px;
          font-weight: 600;
          color: #059669;
        }

        .wallet-address {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          color: #6b7280;
        }

        .wallet-address .address {
          font-family: monospace;
        }

        .transfer-form h4 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }

        .form-group {
          margin-bottom: 16px;
          position: relative;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .form-group input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
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

        .max-button {
          position: absolute;
          right: 12px;
          top: 36px;
          background: #3b82f6;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          user-select: none;
        }

        .max-button:hover {
          background: #2563eb;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 10px 12px;
          border-radius: 6px;
          font-size: 14px;
          margin-bottom: 12px;
        }

        .success-message {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #16a34a;
          padding: 10px 12px;
          border-radius: 6px;
          font-size: 14px;
          margin-bottom: 12px;
          word-break: break-all;
        }

        .transfer-button {
          width: 100%;
          background: #3b82f6;
          color: white;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .transfer-button:hover:not(:disabled) {
          background: #2563eb;
        }

        .transfer-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .label {
          font-size: 14px;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};
