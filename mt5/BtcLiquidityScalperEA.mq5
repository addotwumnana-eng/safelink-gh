#property strict
#property description "BTC scalping EA for MT5 (Exness-friendly symbol resolution)"
#property version   "1.00"

#include <Trade/Trade.mqh>

input string          InpSymbolHint               = "BTCUSD";
input ENUM_TIMEFRAMES InpTradeTF                  = PERIOD_M5;
input ENUM_TIMEFRAMES InpTrendTF                  = PERIOD_M15;
input ulong           InpMagicNumber              = 26062026;

input double          InpRiskPercentPerTrade      = 0.50;
input double          InpMaxDailyLossPercent      = 2.50;
input int             InpMaxTradesPerDay          = 6;
input int             InpMaxConsecutiveLosses     = 3;
input int             InpCooldownMinutes          = 20;
input int             InpMaxSpreadPoints          = 350;
input int             InpDeviationPoints          = 30;
input int             InpMinStopLossPoints        = 250;
input int             InpStopBufferPoints         = 120;
input double          InpRiskReward               = 1.20;

input int             InpSweepLookbackBars        = 30;
input int             InpSweepBufferPoints        = 100;
input double          InpMinWickRatio             = 0.45;
input double          InpMaxBodyRatio             = 0.45;
input double          InpExhaustionAtrMultiplier  = 1.10;
input int             InpRsiPeriod                = 14;
input double          InpRsiOverbought            = 70.0;
input double          InpRsiOversold              = 30.0;
input int             InpAtrPeriod                = 14;
input int             InpFastEmaPeriod            = 20;
input int             InpSlowEmaPeriod            = 50;
input int             InpVolumeAvgBars            = 20;
input double          InpVolumeSpikeMultiplier    = 1.20;
input bool            InpRequireTrendAlignment    = true;
input int             InpMinSetupScore            = 75;

input bool            InpUseBreakEven             = true;
input double          InpBreakEvenAtR             = 0.80;
input int             InpBreakEvenLockPoints      = 40;
input bool            InpUseAtrTrail              = true;
input double          InpAtrTrailMultiplier       = 0.90;

input bool            InpUseSessionFilter         = true;
input int             InpSessionStartHourServer   = 7;
input int             InpSessionEndHourServer     = 21;

CTrade trade;

string   g_symbol                     = "";
datetime g_lastBarTime                = 0;
datetime g_lastEntryTime              = 0;
double   g_dayStartBalance            = 0.0;
int      g_dayOfYear                  = -1;
int      g_todayTrades                = 0;
int      g_consecutiveLosses          = 0;

int g_fastEmaTradeHandle              = INVALID_HANDLE;
int g_slowEmaTradeHandle              = INVALID_HANDLE;
int g_fastEmaTrendHandle              = INVALID_HANDLE;
int g_slowEmaTrendHandle              = INVALID_HANDLE;
int g_rsiHandle                       = INVALID_HANDLE;
int g_atrHandle                       = INVALID_HANDLE;

string ToUpperCopy(string value)
{
   StringToUpper(value);
   return value;
}

string ResolveBtcSymbol()
{
   if(SymbolSelect(InpSymbolHint, true))
      return InpSymbolHint;

   string hint = ToUpperCopy(InpSymbolHint);
   string fallback = "";
   int total = SymbolsTotal(false);

   for(int i = 0; i < total; i++)
   {
      string candidate = SymbolName(i, false);
      string upperCandidate = ToUpperCopy(candidate);

      if(StringFind(upperCandidate, hint) >= 0)
      {
         SymbolSelect(candidate, true);
         return candidate;
      }

      if(fallback == "" && StringFind(upperCandidate, "BTC") >= 0 && StringFind(upperCandidate, "USD") >= 0)
         fallback = candidate;
   }

   if(fallback != "")
      SymbolSelect(fallback, true);

   return fallback;
}

bool CopyIndicatorValue(const int handle, const int shift, double &value)
{
   double temp[1];
   if(CopyBuffer(handle, 0, shift, 1, temp) != 1)
      return false;
   value = temp[0];
   return true;
}

bool IsNewBar()
{
   datetime times[1];
   if(CopyTime(g_symbol, InpTradeTF, 0, 1, times) != 1)
      return false;

   if(times[0] == g_lastBarTime)
      return false;

   g_lastBarTime = times[0];
   return true;
}

void RefreshDailyState()
{
   MqlDateTime now;
   TimeToStruct(TimeCurrent(), now);

   if(now.day_of_year == g_dayOfYear)
      return;

   g_dayOfYear = now.day_of_year;
   g_dayStartBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   g_todayTrades = 0;
   g_consecutiveLosses = 0;
}

bool IsSessionAllowed()
{
   if(!InpUseSessionFilter)
      return true;

   MqlDateTime now;
   TimeToStruct(TimeCurrent(), now);

   if(now.day_of_week == 0 || now.day_of_week == 6)
      return false;

   int hour = now.hour;
   int startHour = InpSessionStartHourServer;
   int endHour = InpSessionEndHourServer;

   if(startHour == endHour)
      return true;

   if(startHour < endHour)
      return (hour >= startHour && hour < endHour);

   return (hour >= startHour || hour < endHour);
}

bool DailyLossExceeded()
{
   if(g_dayStartBalance <= 0.0)
      return false;

   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double drawdownPercent = ((g_dayStartBalance - equity) / g_dayStartBalance) * 100.0;
   return drawdownPercent >= InpMaxDailyLossPercent;
}

bool HasOpenPosition()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;

      string symbol = PositionGetString(POSITION_SYMBOL);
      long magic = PositionGetInteger(POSITION_MAGIC);
      if(symbol == g_symbol && (ulong)magic == InpMagicNumber)
         return true;
   }

   return false;
}

ulong GetOpenPositionTicket()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;

      string symbol = PositionGetString(POSITION_SYMBOL);
      long magic = PositionGetInteger(POSITION_MAGIC);
      if(symbol == g_symbol && (ulong)magic == InpMagicNumber)
         return ticket;
   }

   return 0;
}

bool IsSpreadHealthy()
{
   long spread = SymbolInfoInteger(g_symbol, SYMBOL_SPREAD);
   return (spread >= 0 && spread <= InpMaxSpreadPoints);
}

bool IsVolatilityHealthy()
{
   double atr = 0.0;
   if(!CopyIndicatorValue(g_atrHandle, 1, atr))
      return false;

   double point = SymbolInfoDouble(g_symbol, SYMBOL_POINT);
   if(point <= 0.0)
      return false;

   double atrPoints = atr / point;
   return (atrPoints >= 250.0 && atrPoints <= 6000.0);
}

bool IsTrendAligned(const bool bullish)
{
   double fastTrade = 0.0, slowTrade = 0.0, fastTrend = 0.0, slowTrend = 0.0;
   if(!CopyIndicatorValue(g_fastEmaTradeHandle, 1, fastTrade) ||
      !CopyIndicatorValue(g_slowEmaTradeHandle, 1, slowTrade) ||
      !CopyIndicatorValue(g_fastEmaTrendHandle, 1, fastTrend) ||
      !CopyIndicatorValue(g_slowEmaTrendHandle, 1, slowTrend))
      return false;

   if(bullish)
      return (fastTrade > slowTrade && fastTrend > slowTrend);

   return (fastTrade < slowTrade && fastTrend < slowTrend);
}

bool HasVolumeSpike()
{
   long currentVolume = (long)iVolume(g_symbol, InpTradeTF, 1);
   if(currentVolume <= 0)
      return false;

   double sum = 0.0;
   for(int i = 2; i < 2 + InpVolumeAvgBars; i++)
      sum += (double)iVolume(g_symbol, InpTradeTF, i);

   double avg = sum / (double)InpVolumeAvgBars;
   if(avg <= 0.0)
      return false;

   return ((double)currentVolume >= (avg * InpVolumeSpikeMultiplier));
}

bool DetectLiquiditySweep(const bool bullish, double &sweepLevel)
{
   int lookback = MathMax(5, InpSweepLookbackBars);
   double high1 = iHigh(g_symbol, InpTradeTF, 1);
   double low1 = iLow(g_symbol, InpTradeTF, 1);
   double close1 = iClose(g_symbol, InpTradeTF, 1);
   double open1 = iOpen(g_symbol, InpTradeTF, 1);
   double range1 = high1 - low1;
   if(range1 <= 0.0)
      return false;

   double bodyRatio = MathAbs(close1 - open1) / range1;
   if(bodyRatio > InpMaxBodyRatio)
      return false;

   double point = SymbolInfoDouble(g_symbol, SYMBOL_POINT);
   double sweepBuffer = InpSweepBufferPoints * point;

   if(bullish)
   {
      int idx = iLowest(g_symbol, InpTradeTF, MODE_LOW, lookback, 2);
      if(idx < 0)
         return false;

      double swingLow = iLow(g_symbol, InpTradeTF, idx);
      double lowerWickRatio = (MathMin(open1, close1) - low1) / range1;
      bool swept = (low1 < swingLow - sweepBuffer);
      bool reclaimed = (close1 > swingLow);
      if(swept && reclaimed && lowerWickRatio >= InpMinWickRatio)
      {
         sweepLevel = swingLow;
         return true;
      }
      return false;
   }

   int idx = iHighest(g_symbol, InpTradeTF, MODE_HIGH, lookback, 2);
   if(idx < 0)
      return false;

   double swingHigh = iHigh(g_symbol, InpTradeTF, idx);
   double upperWickRatio = (high1 - MathMax(open1, close1)) / range1;
   bool swept = (high1 > swingHigh + sweepBuffer);
   bool reclaimed = (close1 < swingHigh);
   if(swept && reclaimed && upperWickRatio >= InpMinWickRatio)
   {
      sweepLevel = swingHigh;
      return true;
   }

   return false;
}

bool DetectExhaustion(const bool bullish)
{
   double high1 = iHigh(g_symbol, InpTradeTF, 1);
   double low1 = iLow(g_symbol, InpTradeTF, 1);
   double close1 = iClose(g_symbol, InpTradeTF, 1);
   double open1 = iOpen(g_symbol, InpTradeTF, 1);

   double atr = 0.0;
   double rsi = 50.0;
   if(!CopyIndicatorValue(g_atrHandle, 1, atr) || !CopyIndicatorValue(g_rsiHandle, 1, rsi))
      return false;

   double range = high1 - low1;
   if(range <= 0.0 || atr <= 0.0)
      return false;

   bool expandedCandle = (range >= atr * InpExhaustionAtrMultiplier);
   if(!expandedCandle)
      return false;

   if(bullish)
      return (rsi <= InpRsiOversold && close1 > open1);

   return (rsi >= InpRsiOverbought && close1 < open1);
}

double NormalizeVolume(double volume)
{
   double minVolume = SymbolInfoDouble(g_symbol, SYMBOL_VOLUME_MIN);
   double maxVolume = SymbolInfoDouble(g_symbol, SYMBOL_VOLUME_MAX);
   double step = SymbolInfoDouble(g_symbol, SYMBOL_VOLUME_STEP);
   if(step <= 0.0)
      step = minVolume;

   volume = MathMax(minVolume, MathMin(maxVolume, volume));
   volume = MathFloor(volume / step) * step;
   return NormalizeDouble(volume, 2);
}

double CalculatePositionVolume(const double entryPrice, const double stopPrice)
{
   double riskMoney = AccountInfoDouble(ACCOUNT_BALANCE) * (InpRiskPercentPerTrade / 100.0);
   if(riskMoney <= 0.0)
      return 0.0;

   double tickValue = SymbolInfoDouble(g_symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize = SymbolInfoDouble(g_symbol, SYMBOL_TRADE_TICK_SIZE);
   if(tickValue <= 0.0 || tickSize <= 0.0)
      return 0.0;

   double stopDistance = MathAbs(entryPrice - stopPrice);
   if(stopDistance <= 0.0)
      return 0.0;

   double lossPerLot = (stopDistance / tickSize) * tickValue;
   if(lossPerLot <= 0.0)
      return 0.0;

   double rawVolume = riskMoney / lossPerLot;
   return NormalizeVolume(rawVolume);
}

bool TradeAllowedNow()
{
   if(g_todayTrades >= InpMaxTradesPerDay)
      return false;

   if(g_consecutiveLosses >= InpMaxConsecutiveLosses)
      return false;

   if(g_lastEntryTime > 0 && (TimeCurrent() - g_lastEntryTime) < (InpCooldownMinutes * 60))
      return false;

   if(DailyLossExceeded())
      return false;

   if(!IsSessionAllowed())
      return false;

   if(!IsSpreadHealthy())
      return false;

   if(!IsVolatilityHealthy())
      return false;

   return true;
}

int BuildSetupScore(const bool bullish, const bool sweep, const bool exhaustion, const bool trendAligned, const bool volumeSpike)
{
   int score = 0;

   if(sweep)
      score += 45;
   if(exhaustion)
      score += 25;
   if(trendAligned)
      score += 15;
   if(volumeSpike)
      score += 10;

   double rsi = 50.0;
   if(CopyIndicatorValue(g_rsiHandle, 1, rsi))
   {
      if(bullish && rsi <= 35.0)
         score += 5;
      if(!bullish && rsi >= 65.0)
         score += 5;
   }

   return score;
}

void ManageOpenPosition()
{
   ulong ticket = GetOpenPositionTicket();
   if(ticket == 0 || !PositionSelectByTicket(ticket))
      return;

   long type = PositionGetInteger(POSITION_TYPE);
   double entry = PositionGetDouble(POSITION_PRICE_OPEN);
   double sl = PositionGetDouble(POSITION_SL);
   double tp = PositionGetDouble(POSITION_TP);
   double point = SymbolInfoDouble(g_symbol, SYMBOL_POINT);
   double bid = SymbolInfoDouble(g_symbol, SYMBOL_BID);
   double ask = SymbolInfoDouble(g_symbol, SYMBOL_ASK);
   if(point <= 0.0)
      return;

   if(type == POSITION_TYPE_BUY)
   {
      double current = bid;
      double initialRisk = MathAbs(entry - sl);
      if(initialRisk <= 0.0)
         return;

      if(InpUseBreakEven && current - entry >= initialRisk * InpBreakEvenAtR)
      {
         double beSL = entry + (InpBreakEvenLockPoints * point);
         if(beSL > sl && beSL < current)
            trade.PositionModify(g_symbol, beSL, tp);
      }

      if(InpUseAtrTrail)
      {
         double atr = 0.0;
         if(CopyIndicatorValue(g_atrHandle, 1, atr))
         {
            double trailSL = current - (atr * InpAtrTrailMultiplier);
            if(trailSL > sl && trailSL < current)
               trade.PositionModify(g_symbol, trailSL, tp);
         }
      }
      return;
   }

   if(type == POSITION_TYPE_SELL)
   {
      double current = ask;
      double initialRisk = MathAbs(entry - sl);
      if(initialRisk <= 0.0)
         return;

      if(InpUseBreakEven && entry - current >= initialRisk * InpBreakEvenAtR)
      {
         double beSL = entry - (InpBreakEvenLockPoints * point);
         if((sl == 0.0 || beSL < sl) && beSL > current)
            trade.PositionModify(g_symbol, beSL, tp);
      }

      if(InpUseAtrTrail)
      {
         double atr = 0.0;
         if(CopyIndicatorValue(g_atrHandle, 1, atr))
         {
            double trailSL = current + (atr * InpAtrTrailMultiplier);
            if((sl == 0.0 || trailSL < sl) && trailSL > current)
               trade.PositionModify(g_symbol, trailSL, tp);
         }
      }
   }
}

void TryEnterTrade(const bool bullish)
{
   double sweepLevel = 0.0;
   bool sweep = DetectLiquiditySweep(bullish, sweepLevel);
   if(!sweep)
      return;

   bool exhaustion = DetectExhaustion(bullish);
   bool trendAligned = IsTrendAligned(bullish);
   bool volumeSpike = HasVolumeSpike();

   if(InpRequireTrendAlignment && !trendAligned)
      return;

   int score = BuildSetupScore(bullish, sweep, exhaustion, trendAligned, volumeSpike);
   if(score < InpMinSetupScore)
      return;

   double point = SymbolInfoDouble(g_symbol, SYMBOL_POINT);
   double ask = SymbolInfoDouble(g_symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(g_symbol, SYMBOL_BID);
   double low1 = iLow(g_symbol, InpTradeTF, 1);
   double high1 = iHigh(g_symbol, InpTradeTF, 1);

   double entry = bullish ? ask : bid;
   double stop = 0.0;
   double take = 0.0;

   if(bullish)
   {
      stop = MathMin(low1, sweepLevel) - (InpStopBufferPoints * point);
      if((entry - stop) / point < InpMinStopLossPoints)
         return;
      take = entry + ((entry - stop) * InpRiskReward);
   }
   else
   {
      stop = MathMax(high1, sweepLevel) + (InpStopBufferPoints * point);
      if((stop - entry) / point < InpMinStopLossPoints)
         return;
      take = entry - ((stop - entry) * InpRiskReward);
   }

   double volume = CalculatePositionVolume(entry, stop);
   if(volume <= 0.0)
      return;

   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(InpDeviationPoints);

   bool placed = false;
   if(bullish)
      placed = trade.Buy(volume, g_symbol, 0.0, stop, take, "BTC sweep+exhaustion buy");
   else
      placed = trade.Sell(volume, g_symbol, 0.0, stop, take, "BTC sweep+exhaustion sell");

   if(placed)
      g_lastEntryTime = TimeCurrent();
}

int OnInit()
{
   g_symbol = ResolveBtcSymbol();
   if(g_symbol == "")
   {
      Print("Could not resolve BTC symbol. Set InpSymbolHint to your broker symbol (e.g., BTCUSD, BTCUSDm).");
      return(INIT_FAILED);
   }

   g_fastEmaTradeHandle = iMA(g_symbol, InpTradeTF, InpFastEmaPeriod, 0, MODE_EMA, PRICE_CLOSE);
   g_slowEmaTradeHandle = iMA(g_symbol, InpTradeTF, InpSlowEmaPeriod, 0, MODE_EMA, PRICE_CLOSE);
   g_fastEmaTrendHandle = iMA(g_symbol, InpTrendTF, InpFastEmaPeriod, 0, MODE_EMA, PRICE_CLOSE);
   g_slowEmaTrendHandle = iMA(g_symbol, InpTrendTF, InpSlowEmaPeriod, 0, MODE_EMA, PRICE_CLOSE);
   g_rsiHandle = iRSI(g_symbol, InpTradeTF, InpRsiPeriod, PRICE_CLOSE);
   g_atrHandle = iATR(g_symbol, InpTradeTF, InpAtrPeriod);

   if(g_fastEmaTradeHandle == INVALID_HANDLE ||
      g_slowEmaTradeHandle == INVALID_HANDLE ||
      g_fastEmaTrendHandle == INVALID_HANDLE ||
      g_slowEmaTrendHandle == INVALID_HANDLE ||
      g_rsiHandle == INVALID_HANDLE ||
      g_atrHandle == INVALID_HANDLE)
   {
      Print("Indicator handle initialization failed.");
      return(INIT_FAILED);
   }

   trade.SetExpertMagicNumber(InpMagicNumber);
   RefreshDailyState();

   Print("BTC Liquidity Scalper initialized on symbol: ", g_symbol);
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
   if(g_fastEmaTradeHandle != INVALID_HANDLE) IndicatorRelease(g_fastEmaTradeHandle);
   if(g_slowEmaTradeHandle != INVALID_HANDLE) IndicatorRelease(g_slowEmaTradeHandle);
   if(g_fastEmaTrendHandle != INVALID_HANDLE) IndicatorRelease(g_fastEmaTrendHandle);
   if(g_slowEmaTrendHandle != INVALID_HANDLE) IndicatorRelease(g_slowEmaTrendHandle);
   if(g_rsiHandle != INVALID_HANDLE) IndicatorRelease(g_rsiHandle);
   if(g_atrHandle != INVALID_HANDLE) IndicatorRelease(g_atrHandle);
}

void OnTick()
{
   RefreshDailyState();

   if(HasOpenPosition())
      ManageOpenPosition();

   if(!IsNewBar())
      return;

   if(HasOpenPosition())
      return;

   if(!TradeAllowedNow())
      return;

   TryEnterTrade(true);
   if(!HasOpenPosition())
      TryEnterTrade(false);
}

void OnTradeTransaction(const MqlTradeTransaction &trans, const MqlTradeRequest &request, const MqlTradeResult &result)
{
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD)
      return;

   ulong dealTicket = trans.deal;
   if(dealTicket == 0)
      return;

   if(!HistoryDealSelect(dealTicket))
      return;

   string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
   long magic = HistoryDealGetInteger(dealTicket, DEAL_MAGIC);
   if(symbol != g_symbol || (ulong)magic != InpMagicNumber)
      return;

   long entry = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
   if(entry == DEAL_ENTRY_IN)
   {
      g_todayTrades++;
      return;
   }

   if(entry == DEAL_ENTRY_OUT)
   {
      double profit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT)
                    + HistoryDealGetDouble(dealTicket, DEAL_SWAP)
                    + HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);

      if(profit < 0.0)
         g_consecutiveLosses++;
      else if(profit > 0.0)
         g_consecutiveLosses = 0;
   }
}
