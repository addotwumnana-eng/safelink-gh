# MT5 BTC Liquidity Scalper (Exness-ready)

This folder contains an Expert Advisor for MetaTrader 5:

- **File:** `BtcLiquidityScalperEA.mq5`
- **Purpose:** BTC scalping logic using:
  - liquidity sweep detection,
  - exhaustion confirmation,
  - trend/volume confluence,
  - strict risk guardrails.

## Important reality check

No bot can guarantee a fixed win rate (including 80%+) across all market conditions.  
This EA is built to **improve trade quality** by taking fewer, higher-confluence setups and enforcing loss controls.

## Strategy logic

1. **Liquidity sweep**
   - Looks for a sweep of recent swing highs/lows.
   - Requires price to reclaim back inside the range (rejection behavior).

2. **Exhaustion confirmation**
   - Uses ATR-expanded candle + RSI extreme to confirm possible exhaustion.

3. **Confluence scoring**
   - Sweep + exhaustion + trend alignment + volume spike + RSI context.
   - Only trades when score is above a minimum threshold (`InpMinSetupScore`).

4. **Risk management**
   - Position sizing by fixed percentage risk (`InpRiskPercentPerTrade`).
   - Daily loss stop (`InpMaxDailyLossPercent`).
   - Max trades per day, consecutive-loss cutoff, cooldown window.
   - Break-even and optional ATR trailing stop.

## Exness setup notes

- Exness BTC symbols often vary (examples: `BTCUSD`, `BTCUSDm`).
- Set `InpSymbolHint` to your exact symbol if auto-detection misses.
- Use a low-latency VPS close to broker servers for scalping.
- Keep slippage/spread filters strict during volatile periods.

## Install in MT5

1. Open MT5 -> `File` -> `Open Data Folder`.
2. Put `BtcLiquidityScalperEA.mq5` into:
   - `MQL5/Experts/`
3. Restart MT5 or refresh the Navigator.
4. Compile in MetaEditor.
5. Attach to BTC chart (recommended M5 chart).
6. Enable Algo Trading.

## Backtest and optimization workflow

Use Strategy Tester before live trading:

1. **Symbol:** your Exness BTC symbol.
2. **Timeframe:** M5.
3. **Model:** Every tick based on real ticks (if available).
4. **Optimize these first:**
   - `InpMinSetupScore`
   - `InpRiskReward`
   - `InpSweepLookbackBars`
   - `InpSweepBufferPoints`
   - `InpMaxSpreadPoints`
   - `InpCooldownMinutes`
   - `InpRequireTrendAlignment`
5. **Validate robustness:**
   - Run out-of-sample periods.
   - Test multiple market regimes (trend + chop + high volatility).

## To push win rate higher (without overfitting)

- Increase `InpMinSetupScore` (fewer but cleaner entries).
- Keep `InpRequireTrendAlignment = true`.
- Reduce trading sessions to your best-performing hours only.
- Tighten `InpMaxSpreadPoints` to avoid poor execution windows.
- Add a manual news blackout during major USD macro releases.
- Keep risk per trade small (0.25% to 0.75%) so losing streaks stay survivable.

## Suggested baseline profile for conservative scalping

- `InpRiskPercentPerTrade = 0.50`
- `InpMaxDailyLossPercent = 2.50`
- `InpMaxTradesPerDay = 4 to 6`
- `InpMinSetupScore = 80`
- `InpRequireTrendAlignment = true`
- `InpRiskReward = 1.10 to 1.40`

## Final note

Run on demo first, then move to small live size.  
If you want, the next iteration can add:

- multi-timeframe market structure (BOS/CHOCH),
- partial take-profit and scale-out logic,
- session-specific parameter profiles,
- auto-disable around high-impact economic calendar events.
