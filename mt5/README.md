# MT5 BTC Liquidity Scalper (Exness-ready)

This folder contains an Expert Advisor for MetaTrader 5:

- **File:** `BtcLiquidityScalperEA.mq5`
- **Purpose:** BTC scalping logic using:
  - liquidity sweep detection,
  - exhaustion confirmation,
  - BOS/CHOCH structure filter,
  - session-specific profiles,
  - partial TP scale-out,
  - strict risk guardrails.

## Important reality check

No bot can guarantee a fixed win rate (including 80%+) across all market conditions.  
This EA is designed to raise setup quality, reduce poor entries, and preserve capital through strict controls.

## What is implemented

1. **Liquidity sweep + reclaim**
   - Detects sweep of recent swing highs/lows.
   - Requires reclaim + wick/body quality.

2. **Exhaustion confirmation**
   - Uses ATR-expanded candle and RSI extremes.

3. **BOS/CHOCH market structure filter**
   - Swing structure analysis with configurable swing strength/lookback.
   - Supports trend continuation (BOS) and optional reversal entry mode (CHOCH).

4. **Confluence score gate**
   - Sweep + exhaustion + trend + volume + BOS/CHOCH + RSI.
   - Trade only when setup score reaches session-adjusted minimum.

5. **Partial take-profit + scale-out**
   - Closes a configurable portion at a target R multiple.
   - Keeps runner position with break-even / ATR trailing protection.

6. **Session profiles (Asia/London/New York)**
   - Per-session:
     - minimum setup score,
     - risk multiplier,
     - risk-reward multiplier,
     - max spread cap.

7. **Economic news blackout (manual schedule)**
   - Blocks entries during configured server-time windows (e.g., CPI/NFP windows).
   - Uses `InpNewsBlackoutWeekdays` + `InpNewsBlackoutWindowsServer`.

## Exness setup notes

- Exness BTC symbols often vary (`BTCUSD`, `BTCUSDm`, etc.).
- Set `InpSymbolHint` to your exact broker symbol if auto-detection misses.
- Use low-latency VPS execution for scalping.
- Keep spread/deviation filters strict in high-volatility windows.

## Install in MT5

1. Open MT5 -> `File` -> `Open Data Folder`
2. Place `BtcLiquidityScalperEA.mq5` in:
   - `MQL5/Experts/`
3. Restart MT5 or refresh Navigator.
4. Compile in MetaEditor.
5. Attach to BTC chart (recommended M5).
6. Enable Algo Trading.

## Core inputs to tune first

- Symbol:
  - `InpSymbolHint`
- Quality gating:
  - `InpMinSetupScore`
  - `InpRequireTrendAlignment`
  - `InpUseStructureFilter`
  - `InpAllowChochReversal`
- Risk:
  - `InpRiskPercentPerTrade`
  - `InpMaxDailyLossPercent`
  - `InpMaxConsecutiveLosses`
- Execution:
  - `InpMaxSpreadPoints`
  - `InpDeviationPoints`
- Partial TP:
  - `InpUsePartialTakeProfit`
  - `InpPartialTakeProfitAtR`
  - `InpPartialTakeProfitPercent`
- Session profiles:
  - `InpUseSessionProfiles`
  - `InpAsia*`, `InpLondon*`, `InpNewYork*`
- News blackout:
  - `InpUseNewsBlackout`
  - `InpNewsBlackoutWeekdays`
  - `InpNewsBlackoutWindowsServer`

## Example blackout windows (server time)

- `InpNewsBlackoutWeekdays = "1,2,3,4,5"`
- `InpNewsBlackoutWindowsServer = "13:20-13:50;15:50-16:10"`

These can represent "no-trade" windows around major releases.

## Backtest + validation workflow

1. **Symbol:** your exact Exness BTC symbol.
2. **Timeframe:** M5.
3. **Model:** Every tick based on real ticks (if available).
4. **Optimize in passes (avoid overfitting):**
   - Pass 1: spread/session/risk controls
   - Pass 2: structure + sweep + exhaustion thresholds
   - Pass 3: partial TP and trailing behavior
5. **Validate out-of-sample** across trend, range, and high-volatility periods.

## Baseline conservative profile

- `InpRiskPercentPerTrade = 0.50`
- `InpMaxDailyLossPercent = 2.50`
- `InpMaxTradesPerDay = 4..6`
- `InpUseStructureFilter = true`
- `InpRequireTrendAlignment = true`
- `InpMinSetupScore = 80`
- `InpUsePartialTakeProfit = true`
- `InpPartialTakeProfitAtR = 1.0`
- `InpPartialTakeProfitPercent = 50`

## Final note

Run on demo first, then move to small live size.  
The strongest edge usually comes from:

- strict filtering,
- disciplined risk,
- avoiding major news windows,
- and regular re-validation by market regime.
