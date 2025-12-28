import React, { useState, useEffect } from 'react';
import { useSbtcPool } from '../../hooks/useSbtcPool';
import { useWalletConnect } from '../../hooks/useWalletConnect';

type SwapDirection = 'stx-to-sbtc' | 'sbtc-to-stx';

export const SwapInterface: React.FC = () => {
  const { connected } = useWalletConnect();
  const { reserves, loading, swapStxForSbtc, swapSbtcForStx, isInitialized } = useSbtcPool();

  const [direction, setDirection] = useState<SwapDirection>('stx-to-sbtc');
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [swapLoading, setSwapLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Calculate output amount based on constant product formula
  const calculateOutputAmount = (input: number): number => {
    if (!input || input <= 0) return 0;

    const fee = 0.003; // 0.3% fee
    const inputWithFee = input * (1 - fee);

    if (direction === 'stx-to-sbtc') {
      // STX -> sBTC
      const stxReserve = reserves.stx;
      const sbtcReserve = reserves.sbtc;
      if (stxReserve === 0 || sbtcReserve === 0) return 0;

      const outputAmount = (sbtcReserve * inputWithFee) / (stxReserve + inputWithFee);
      return outputAmount;
    } else {
      // sBTC -> STX
      const sbtcReserve = reserves.sbtc;
      const stxReserve = reserves.stx;
      if (sbtcReserve === 0 || stxReserve === 0) return 0;

      const outputAmount = (stxReserve * inputWithFee) / (sbtcReserve + inputWithFee);
      return outputAmount;
    }
  };

  // Update output amount when input changes
  useEffect(() => {
    const input = parseFloat(inputAmount);
    if (!isNaN(input) && input > 0) {
      const output = calculateOutputAmount(input);
      setOutputAmount(output.toFixed(8));
    } else {
      setOutputAmount('');
    }
  }, [inputAmount, direction, reserves]);

  const handleSwapDirection = () => {
    setDirection(prev => prev === 'stx-to-sbtc' ? 'sbtc-to-stx' : 'stx-to-sbtc');
    setInputAmount(outputAmount);
    setOutputAmount('');
  };

  const handleSwap = async () => {
    setError('');
    setSuccess('');

    const input = parseFloat(inputAmount);
    const output = parseFloat(outputAmount);

    if (isNaN(input) || input <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (isNaN(output) || output <= 0) {
      setError('Invalid output amount');
      return;
    }

    // Calculate minimum output with slippage
    const slippagePercent = parseFloat(slippage) / 100;
    const minOutput = output * (1 - slippagePercent);

    try {
      setSwapLoading(true);
      let txId: any;

      if (direction === 'stx-to-sbtc') {
        txId = await swapStxForSbtc(input, minOutput);
      } else {
        txId = await swapSbtcForStx(input, minOutput);
      }

      setSuccess(`Swap submitted! TX ID: ${txId}`);
      setInputAmount('');
      setOutputAmount('');
    } catch (err: any) {
      setError(err.message || 'Swap failed');
    } finally {
      setSwapLoading(false);
    }
  };

  const getPrice = (): string => {
    if (reserves.stx === 0 || reserves.sbtc === 0) return '0';
    const price = direction === 'stx-to-sbtc'
      ? reserves.sbtc / reserves.stx
      : reserves.stx / reserves.sbtc;
    return price.toFixed(8);
  };

  if (!connected) {
    return (
      <div className="swap-interface">
        <h3>Swap</h3>
        <p>Connect your wallet to start swapping</p>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="swap-interface">
        <h3>Swap</h3>
        <p>Pool is not initialized yet</p>
      </div>
    );
  }

  return (
    <div className="swap-interface">
      <div className="swap-header">
        <h3>Swap</h3>
        <div className="slippage-control">
          <label>Slippage:</label>
          <select value={slippage} onChange={(e) => setSlippage(e.target.value)}>
            <option value="0.1">0.1%</option>
            <option value="0.5">0.5%</option>
            <option value="1">1.0%</option>
            <option value="3">3.0%</option>
          </select>
        </div>
      </div>

      <div className="swap-container">
        <div className="swap-input-group">
          <div className="input-header">
            <span className="label">From</span>
            <span className="balance">
              Balance: {direction === 'stx-to-sbtc' ? reserves.stx.toFixed(2) : reserves.sbtc.toFixed(8)}
            </span>
          </div>
          <div className="input-wrapper">
            <input
              type="number"
              step="0.00000001"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              placeholder="0.00"
              disabled={swapLoading}
            />
            <div className="token-display">
              {direction === 'stx-to-sbtc' ? 'STX' : 'sBTC'}
            </div>
          </div>
        </div>

        <div className="swap-direction-button" onClick={handleSwapDirection}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 3v14M10 17l-4-4M10 17l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div className="swap-input-group">
          <div className="input-header">
            <span className="label">To</span>
            <span className="balance">
              Balance: {direction === 'sbtc-to-stx' ? reserves.stx.toFixed(2) : reserves.sbtc.toFixed(8)}
            </span>
          </div>
          <div className="input-wrapper">
            <input
              type="number"
              value={outputAmount}
              readOnly
              placeholder="0.00"
              disabled={swapLoading}
            />
            <div className="token-display">
              {direction === 'stx-to-sbtc' ? 'sBTC' : 'STX'}
            </div>
          </div>
        </div>
      </div>

      <div className="swap-info">
        <div className="info-row">
          <span>Price:</span>
          <span>
            1 {direction === 'stx-to-sbtc' ? 'STX' : 'sBTC'} = {getPrice()} {direction === 'stx-to-sbtc' ? 'sBTC' : 'STX'}
          </span>
        </div>
        <div className="info-row">
          <span>Fee:</span>
          <span>0.3%</span>
        </div>
        <div className="info-row">
          <span>Min. received:</span>
          <span>
            {outputAmount ? (parseFloat(outputAmount) * (1 - parseFloat(slippage) / 100)).toFixed(8) : '0.00'}
          </span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <button
        className="swap-button"
        onClick={handleSwap}
        disabled={swapLoading || !inputAmount || !outputAmount}
      >
        {swapLoading ? 'Swapping...' : 'Swap'}
      </button>

      <style jsx>{`
        .swap-interface {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
          max-width: 500px;
        }

        .swap-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .swap-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #111827;
        }

        .slippage-control {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #6b7280;
        }

        .slippage-control select {
          padding: 4px 8px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .swap-container {
          background: #f9fafb;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .swap-input-group {
          margin-bottom: 8px;
        }

        .swap-input-group:last-of-type {
          margin-bottom: 0;
        }

        .input-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .input-header .label {
          color: #6b7280;
          font-weight: 500;
        }

        .input-header .balance {
          color: #9ca3af;
          font-size: 12px;
        }

        .input-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 12px;
        }

        .input-wrapper input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 18px;
          font-weight: 500;
        }

        .input-wrapper input:disabled {
          background: transparent;
        }

        .token-display {
          background: #f3f4f6;
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          color: #374151;
        }

        .swap-direction-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          margin: -18px auto;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 50%;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.2s;
          position: relative;
          z-index: 1;
        }

        .swap-direction-button:hover {
          border-color: #3b82f6;
          color: #3b82f6;
          transform: rotate(180deg);
        }

        .swap-info {
          background: #f9fafb;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 8px;
        }

        .info-row:last-child {
          margin-bottom: 0;
        }

        .info-row span:last-child {
          font-weight: 500;
          color: #111827;
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

        .swap-button {
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

        .swap-button:hover:not(:disabled) {
          background: #2563eb;
        }

        .swap-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
