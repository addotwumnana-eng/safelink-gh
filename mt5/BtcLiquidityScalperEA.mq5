#property strict
#property description "BTC scalping EA for MT5 (Exness-friendly symbol resolution)"
#property version   "1.10"

#include <Trade/Trade.mqh>

enum SessionProfileType
{
   SESSION_PROFILE_NONE = 0,
   SESSION_PROFILE_ASIA = 1,
   SESSION_PROFILE_LONDON = 2,
   SESSION_PROFILE_NEWYORK = 3
};

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

input bool            InpUseStructureFilter       = true;
input int             InpStructureLookbackBars    = 120;
input int             InpSwingStrength            = 2;
input bool            InpAllowChochReversal       = true;

input bool            InpUseBreakEven             = true;
input double          InpBreakEvenAtR             = 0.80;
input int             InpBreakEvenLockPoints      = 40;
input bool            InpUseAtrTrail              = true;
input double          InpAtrTrailMultiplier       = 0.90;

input bool            InpUsePartialTakeProfit     = true;
input double          InpPartialTakeProfitAtR     = 1.00;
input double          InpPartialTakeProfitPercent = 50.0;

input bool            InpUseSessionFilter         = true;
input int             InpSessionStartHourServer   = 7;
input int             InpSessionEndHourServer     = 21;

input bool            InpUseSessionProfiles       = true;
input bool            InpEnableAsiaSession        = true;
input int             InpAsiaStartHour            = 0;
input int             InpAsiaEndHour              = 8;
input int             InpAsiaMinSetupScore        = 82;
input double          InpAsiaRiskMultiplier       = 0.70;
input double          InpAsiaRiskRewardMultiplier = 0.95;
input int             InpAsiaMaxSpreadPoints      = 280;

input bool            InpEnableLondonSession      = true;
input int             InpLondonStartHour          = 7;
input int             InpLondonEndHour            = 16;
input int             InpLondonMinSetupScore      = 75;
input double          InpLondonRiskMultiplier     = 1.00;
input double          InpLondonRiskRewardMultiplier = 1.15;
input int             InpLondonMaxSpreadPoints    = 350;

input bool            InpEnableNewYorkSession     = true;
input int             InpNewYorkStartHour         = 13;
input int             InpNewYorkEndHour           = 21;
input int             InpNewYorkMinSetupScore     = 78;
input double          InpNewYorkRiskMultiplier    = 0.90;
input double          InpNewYorkRiskRewardMultiplier = 1.05;
input int             InpNewYorkMaxSpreadPoints   = 320;

input bool            InpUseNewsBlackout          = true;
input string          InpNewsBlackoutWeekdays     = "1,2,3,4,5";
input string          InpNewsBlackoutWindowsServer = "13:20-13:50;15:50-16:10";

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

string TrimCopy(string value)
{
   StringTrimLeft(value);
   StringTrimRight(value);
   return value;
}

string PositionMetaKey(const ulong positionId, const string suffix)
{
   return "BLS_" + (string)InpMagicNumber + "_" + (string)positionId + "_" + suffix;
}

void SetPositionMeta(const ulong positionId, const double initialSL, const double initialVolume)
{
   if(positionId == 0)
      return;

   GlobalVariableSet(PositionMetaKey(positionId, "sl"), initialSL);
   GlobalVariableSet(PositionMetaKey(positionId, "vol"), initialVolume);
   GlobalVariableSet(PositionMetaKey(positionId, "partial"), 0.0);
}

bool GetPositionMeta(const ulong positionId, double &initialSL, double &initialVolume, bool &partialDone)
{
   string slKey = PositionMetaKey(positionId, "sl");
   string volKey = PositionMetaKey(positionId, "vol");
   string partialKey = PositionMetaKey(positionId, "partial");

   if(!GlobalVariableCheck(slKey) || !GlobalVariableCheck(volKey))
      return false;

   initialSL = GlobalVariableGet(slKey);
   initialVolume = GlobalVariableGet(volKey);
   partialDone = (GlobalVariableCheck(partialKey) && GlobalVariableGet(partialKey) > 0.5);
   return true;
}

void MarkPartialDone(const ulong positionId)
{
   if(positionId == 0)
      return;

   GlobalVariableSet(PositionMetaKey(positionId, "partial"), 1.0);
}

void ClearPositionMeta(const ulong positionId)
{
   if(positionId == 0)
      return;

   GlobalVariableDel(PositionMetaKey(positionId, "sl"));
   GlobalVariableDel(PositionMetaKey(positionId, "vol"));
   GlobalVariableDel(PositionMetaKey(positionId, "partial"));
}

bool CopyIndicatorValue(const int handle, const int shift, double &value)
{
   double temp[1];
   if(CopyBuffer(handle, 0, shift, 1, temp) != 1)
      return false;

   value = temp[0];
   return true;
}

bool IsHourInWindow(const int hour, const int startHour, const int endHour)
{
   if(startHour == endHour)
      return true;

   if(startHour < endHour)
      return (hour >= startHour && hour < endHour);

   return (hour >= startHour || hour < endHour);
}

bool IsMinuteInWindow(const int minuteOfDay, const int startMinute, const int endMinute)
{
   if(startMinute == endMinute)
      return true;

   if(startMinute < endMinute)
      return (minuteOfDay >= startMinute && minuteOfDay < endMinute);

   return (minuteOfDay >= startMinute || minuteOfDay < endMinute);
}

SessionProfileType GetCurrentSessionProfile()
{
   if(!InpUseSessionProfiles)
      return SESSION_PROFILE_NONE;

   MqlDateTime now;
   TimeToStruct(TimeCurrent(), now);
   int hour = now.hour;

   if(InpEnableLondonSession && IsHourInWindow(hour, InpLondonStartHour, InpLondonEndHour))
      return SESSION_PROFILE_LONDON;
   if(InpEnableNewYorkSession && IsHourInWindow(hour, InpNewYorkStartHour, InpNewYorkEndHour))
      return SESSION_PROFILE_NEWYORK;
   if(InpEnableAsiaSession && IsHourInWindow(hour, InpAsiaStartHour, InpAsiaEndHour))
      return SESSION_PROFILE_ASIA;

   return SESSION_PROFILE_NONE;
}

int GetActiveMinSetupScore()
{
   SessionProfileType profile = GetCurrentSessionProfile();
   if(profile == SESSION_PROFILE_ASIA)
      return InpAsiaMinSetupScore;
   if(profile == SESSION_PROFILE_LONDON)
      return InpLondonMinSetupScore;
   if(profile == SESSION_PROFILE_NEWYORK)
      return InpNewYorkMinSetupScore;

   return InpMinSetupScore;
}

double GetActiveRiskMultiplier()
{
   SessionProfileType profile = GetCurrentSessionProfile();
   if(profile == SESSION_PROFILE_ASIA)
      return InpAsiaRiskMultiplier;
   if(profile == SESSION_PROFILE_LONDON)
      return InpLondonRiskMultiplier;
   if(profile == SESSION_PROFILE_NEWYORK)
      return InpNewYorkRiskMultiplier;

   return 1.0;
}

double GetActiveRiskRewardMultiplier()
{
   SessionProfileType profile = GetCurrentSessionProfile();
   if(profile == SESSION_PROFILE_ASIA)
      return InpAsiaRiskRewardMultiplier;
   if(profile == SESSION_PROFILE_LONDON)
      return InpLondonRiskRewardMultiplier;
   if(profile == SESSION_PROFILE_NEWYORK)
      return InpNewYorkRiskRewardMultiplier;

   return 1.0;
}

int GetActiveMaxSpreadPoints()
{
   SessionProfileType profile = GetCurrentSessionProfile();
   if(profile == SESSION_PROFILE_ASIA)
      return InpAsiaMaxSpreadPoints;
   if(profile == SESSION_PROFILE_LONDON)
      return InpLondonMaxSpreadPoints;
   if(profile == SESSION_PROFILE_NEWYORK)
      return InpNewYorkMaxSpreadPoints;

   return InpMaxSpreadPoints;
}

double GetActiveRiskPercent()
{
   double risk = InpRiskPercentPerTrade * GetActiveRiskMultiplier();
   return MathMax(0.05, risk);
}

double GetActiveRiskReward()
{
   double rr = InpRiskReward * GetActiveRiskRewardMultiplier();
   return MathMax(0.60, rr);
}

bool ContainsIntInCsv(const string csv, const int target)
{
   string trimmedCsv = TrimCopy(csv);
   if(trimmedCsv == "")
      return true;

   string tokens[];
   int count = StringSplit(trimmedCsv, ',', tokens);
   if(count <= 0)
      return false;

   for(int i = 0; i < count; i++)
   {
      string item = TrimCopy(tokens[i]);
      if(item == "")
         continue;

      if((int)StringToInteger(item) == target)
         return true;
   }

   return false;
}

bool ParseHourMinute(const string hhmm, int &minuteOfDay)
{
   string text = TrimCopy(hhmm);
   string parts[];
   int count = StringSplit(text, ':', parts);
   if(count != 2)
      return false;

   int hour = (int)StringToInteger(TrimCopy(parts[0]));
   int minute = (int)StringToInteger(TrimCopy(parts[1]));
   if(hour < 0 || hour > 23 || minute < 0 || minute > 59)
      return false;

   minuteOfDay = hour * 60 + minute;
   return true;
}

bool ParseNewsWindow(const string token, int &startMinute, int &endMinute)
{
   string text = TrimCopy(token);
   if(text == "")
      return false;

   string parts[];
   int count = StringSplit(text, '-', parts);
   if(count != 2)
      return false;

   return ParseHourMinute(parts[0], startMinute) && ParseHourMinute(parts[1], endMinute);
}

bool IsNewsBlackoutNow()
{
   if(!InpUseNewsBlackout)
      return false;

   MqlDateTime now;
   TimeToStruct(TimeCurrent(), now);

   if(!ContainsIntInCsv(InpNewsBlackoutWeekdays, now.day_of_week))
      return false;

   int minuteOfDay = now.hour * 60 + now.min;
   string windows[];
   int count = StringSplit(InpNewsBlackoutWindowsServer, ';', windows);
   if(count <= 0)
      return false;

   for(int i = 0; i < count; i++)
   {
      int startMinute = 0;
      int endMinute = 0;
      if(!ParseNewsWindow(windows[i], startMinute, endMinute))
         continue;

      if(IsMinuteInWindow(minuteOfDay, startMinute, endMinute))
         return true;
   }

   return false;
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
   MqlDateTime now;
   TimeToStruct(TimeCurrent(), now);

   if(now.day_of_week == 0 || now.day_of_week == 6)
      return false;

   if(InpUseSessionProfiles)
      return (GetCurrentSessionProfile() != SESSION_PROFILE_NONE);

   if(!InpUseSessionFilter)
      return true;

   return IsHourInWindow(now.hour, InpSessionStartHourServer, InpSessionEndHourServer);
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

bool IsSpreadHealthy(const int spreadLimitPoints)
{
   long spread = SymbolInfoInteger(g_symbol, SYMBOL_SPREAD);
   return (spread >= 0 && spread <= spreadLimitPoints);
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

bool IsSwingHighAt(const int shift, const int strength)
{
   double candidate = iHigh(g_symbol, InpTradeTF, shift);
   if(candidate <= 0.0)
      return false;

   for(int k = 1; k <= strength; k++)
   {
      double left = iHigh(g_symbol, InpTradeTF, shift + k);
      double right = iHigh(g_symbol, InpTradeTF, shift - k);
      if(candidate <= left || candidate <= right)
         return false;
   }

   return true;
}

bool IsSwingLowAt(const int shift, const int strength)
{
   double candidate = iLow(g_symbol, InpTradeTF, shift);
   if(candidate <= 0.0)
      return false;

   for(int k = 1; k <= strength; k++)
   {
      double left = iLow(g_symbol, InpTradeTF, shift + k);
      double right = iLow(g_symbol, InpTradeTF, shift - k);
      if(candidate >= left || candidate >= right)
         return false;
   }

   return true;
}

bool FindRecentSwingStructure(double &latestHigh, double &priorHigh, double &latestLow, double &priorLow)
{
   int bars = iBars(g_symbol, InpTradeTF);
   int strength = MathMax(1, InpSwingStrength);
   int maxShift = MathMin(InpStructureLookbackBars, bars - strength - 1);

   if(maxShift <= strength + 1)
      return false;

   int foundHigh = 0;
   int foundLow = 0;

   for(int shift = strength + 1; shift <= maxShift; shift++)
   {
      if(foundHigh < 2 && IsSwingHighAt(shift, strength))
      {
         if(foundHigh == 0)
            latestHigh = iHigh(g_symbol, InpTradeTF, shift);
         else
            priorHigh = iHigh(g_symbol, InpTradeTF, shift);
         foundHigh++;
      }

      if(foundLow < 2 && IsSwingLowAt(shift, strength))
      {
         if(foundLow == 0)
            latestLow = iLow(g_symbol, InpTradeTF, shift);
         else
            priorLow = iLow(g_symbol, InpTradeTF, shift);
         foundLow++;
      }

      if(foundHigh >= 2 && foundLow >= 2)
         return true;
   }

   return false;
}

bool PassStructureFilter(const bool bullish, bool &isBos, bool &isChoch)
{
   isBos = false;
   isChoch = false;

   if(!InpUseStructureFilter)
      return true;

   double latestHigh = 0.0, priorHigh = 0.0, latestLow = 0.0, priorLow = 0.0;
   if(!FindRecentSwingStructure(latestHigh, priorHigh, latestLow, priorLow))
      return false;

   double close1 = iClose(g_symbol, InpTradeTF, 1);

   bool bosBull = (latestHigh > priorHigh && latestLow > priorLow);
   bool bosBear = (latestHigh < priorHigh && latestLow < priorLow);
   bool chochBull = (close1 > priorHigh && latestLow <= priorLow);
   bool chochBear = (close1 < priorLow && latestHigh >= priorHigh);

   if(bullish)
   {
      isBos = bosBull;
      isChoch = chochBull;
      if(isBos)
         return true;
      return (InpAllowChochReversal && isChoch);
   }

   isBos = bosBear;
   isChoch = chochBear;
   if(isBos)
      return true;
   return (InpAllowChochReversal && isChoch);
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

double CalculatePositionVolume(const double entryPrice, const double stopPrice, const double riskPercent)
{
   double riskMoney = AccountInfoDouble(ACCOUNT_BALANCE) * (riskPercent / 100.0);
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

double CalculatePositionClosedProfit(const ulong positionId)
{
   if(positionId == 0)
      return 0.0;

   datetime toTime = TimeCurrent() + 60;
   datetime fromTime = TimeCurrent() - (60 * 60 * 24 * 45);
   if(!HistorySelect(fromTime, toTime))
      return 0.0;

   double profit = 0.0;
   int deals = HistoryDealsTotal();
   for(int i = 0; i < deals; i++)
   {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket == 0)
         continue;

      if((ulong)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID) != positionId)
         continue;
      if(HistoryDealGetString(dealTicket, DEAL_SYMBOL) != g_symbol)
         continue;
      if((ulong)HistoryDealGetInteger(dealTicket, DEAL_MAGIC) != InpMagicNumber)
         continue;

      long entryType = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
      if(entryType == DEAL_ENTRY_OUT || entryType == DEAL_ENTRY_OUT_BY)
      {
         profit += HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
         profit += HistoryDealGetDouble(dealTicket, DEAL_SWAP);
         profit += HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
      }
   }

   return profit;
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

   if(IsNewsBlackoutNow())
      return false;

   if(!IsSpreadHealthy(GetActiveMaxSpreadPoints()))
      return false;

   if(!IsVolatilityHealthy())
      return false;

   return true;
}

int BuildSetupScore(const bool bullish,
                   const bool sweep,
                   const bool exhaustion,
                   const bool trendAligned,
                   const bool volumeSpike,
                   const bool isBos,
                   const bool isChoch)
{
   int score = 0;

   if(sweep)
      score += 40;
   if(exhaustion)
      score += 20;
   if(trendAligned)
      score += 12;
   if(volumeSpike)
      score += 10;
   if(isBos)
      score += 10;
   if(isChoch)
      score += 8;

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
   double volume = PositionGetDouble(POSITION_VOLUME);
   ulong positionId = (ulong)PositionGetInteger(POSITION_IDENTIFIER);
   double point = SymbolInfoDouble(g_symbol, SYMBOL_POINT);
   double bid = SymbolInfoDouble(g_symbol, SYMBOL_BID);
   double ask = SymbolInfoDouble(g_symbol, SYMBOL_ASK);
   if(point <= 0.0 || volume <= 0.0)
      return;

   double initialSL = sl;
   double initialVolume = volume;
   bool partialDone = false;
   GetPositionMeta(positionId, initialSL, initialVolume, partialDone);

   double initialRisk = MathAbs(entry - initialSL);
   if(initialRisk <= 0.0)
      initialRisk = MathAbs(entry - sl);
   if(initialRisk <= 0.0)
      return;

   if(type == POSITION_TYPE_BUY)
   {
      double current = bid;
      double rNow = (current - entry) / initialRisk;

      if(InpUsePartialTakeProfit && !partialDone && rNow >= InpPartialTakeProfitAtR)
      {
         double step = SymbolInfoDouble(g_symbol, SYMBOL_VOLUME_STEP);
         double minVolume = SymbolInfoDouble(g_symbol, SYMBOL_VOLUME_MIN);
         double partialVolume = NormalizeVolume(volume * (InpPartialTakeProfitPercent / 100.0));

         if(step > 0.0 && partialVolume >= volume)
            partialVolume = NormalizeVolume(volume - step);

         if(partialVolume >= minVolume && (volume - partialVolume) >= minVolume)
         {
            if(trade.PositionClosePartial(g_symbol, partialVolume, InpDeviationPoints))
            {
               MarkPartialDone(positionId);
               partialDone = true;
            }
         }
      }

      if(InpUseBreakEven && rNow >= InpBreakEvenAtR)
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
      double rNow = (entry - current) / initialRisk;

      if(InpUsePartialTakeProfit && !partialDone && rNow >= InpPartialTakeProfitAtR)
      {
         double step = SymbolInfoDouble(g_symbol, SYMBOL_VOLUME_STEP);
         double minVolume = SymbolInfoDouble(g_symbol, SYMBOL_VOLUME_MIN);
         double partialVolume = NormalizeVolume(volume * (InpPartialTakeProfitPercent / 100.0));

         if(step > 0.0 && partialVolume >= volume)
            partialVolume = NormalizeVolume(volume - step);

         if(partialVolume >= minVolume && (volume - partialVolume) >= minVolume)
         {
            if(trade.PositionClosePartial(g_symbol, partialVolume, InpDeviationPoints))
            {
               MarkPartialDone(positionId);
               partialDone = true;
            }
         }
      }

      if(InpUseBreakEven && rNow >= InpBreakEvenAtR)
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
   bool isBos = false;
   bool isChoch = false;
   if(!PassStructureFilter(bullish, isBos, isChoch))
      return;

   double sweepLevel = 0.0;
   bool sweep = DetectLiquiditySweep(bullish, sweepLevel);
   if(!sweep)
      return;

   bool exhaustion = DetectExhaustion(bullish);
   bool trendAligned = IsTrendAligned(bullish);
   bool volumeSpike = HasVolumeSpike();

   if(InpRequireTrendAlignment && !trendAligned)
      return;

   int score = BuildSetupScore(bullish, sweep, exhaustion, trendAligned, volumeSpike, isBos, isChoch);
   if(score < GetActiveMinSetupScore())
      return;

   double point = SymbolInfoDouble(g_symbol, SYMBOL_POINT);
   double ask = SymbolInfoDouble(g_symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(g_symbol, SYMBOL_BID);
   double low1 = iLow(g_symbol, InpTradeTF, 1);
   double high1 = iHigh(g_symbol, InpTradeTF, 1);
   double rr = GetActiveRiskReward();
   double riskPercent = GetActiveRiskPercent();

   double entry = bullish ? ask : bid;
   double stop = 0.0;
   double take = 0.0;

   if(bullish)
   {
      stop = MathMin(low1, sweepLevel) - (InpStopBufferPoints * point);
      if((entry - stop) / point < InpMinStopLossPoints)
         return;
      take = entry + ((entry - stop) * rr);
   }
   else
   {
      stop = MathMax(high1, sweepLevel) + (InpStopBufferPoints * point);
      if((stop - entry) / point < InpMinStopLossPoints)
         return;
      take = entry - ((stop - entry) * rr);
   }

   double volume = CalculatePositionVolume(entry, stop, riskPercent);
   if(volume <= 0.0)
      return;

   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(InpDeviationPoints);

   bool placed = false;
   if(bullish)
      placed = trade.Buy(volume, g_symbol, 0.0, stop, take, "BTC scalper buy");
   else
      placed = trade.Sell(volume, g_symbol, 0.0, stop, take, "BTC scalper sell");

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
   trade.SetDeviationInPoints(InpDeviationPoints);
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

   long entryType = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
   ulong positionId = (ulong)HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);

   if(entryType == DEAL_ENTRY_IN)
   {
      g_todayTrades++;

      bool selected = false;
      if(positionId > 0)
         selected = PositionSelectByTicket(positionId);

      if(!selected)
         selected = PositionSelect(g_symbol);

      if(selected)
      {
         ulong selectedId = (ulong)PositionGetInteger(POSITION_IDENTIFIER);
         if(positionId == 0 || selectedId == positionId)
         {
            double initialSL = PositionGetDouble(POSITION_SL);
            double initialVolume = PositionGetDouble(POSITION_VOLUME);
            SetPositionMeta(selectedId, initialSL, initialVolume);
         }
      }
      return;
   }

   if(entryType == DEAL_ENTRY_OUT || entryType == DEAL_ENTRY_OUT_BY)
   {
      bool stillOpen = false;
      if(positionId > 0 && PositionSelectByTicket(positionId))
         stillOpen = ((ulong)PositionGetInteger(POSITION_IDENTIFIER) == positionId);
      else if(PositionSelect(g_symbol))
         stillOpen = ((ulong)PositionGetInteger(POSITION_IDENTIFIER) == positionId);

      if(stillOpen)
         return;

      double totalProfit = CalculatePositionClosedProfit(positionId);
      if(totalProfit < 0.0)
         g_consecutiveLosses++;
      else if(totalProfit > 0.0)
         g_consecutiveLosses = 0;

      ClearPositionMeta(positionId);
   }
}
