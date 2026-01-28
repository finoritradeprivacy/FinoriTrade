
export type ChallengeType = 'behavioral' | 'skill' | 'strategic';
export type ChallengeFrequency = 'daily' | 'weekly' | 'monthly';

export interface ChallengeTemplate {
  id: string;
  type: ChallengeType;
  frequency: ChallengeFrequency;
  title: string;
  description: string;
  base_reward_usdt: number;
  base_reward_xp: number;
  target_metric: 'trades_count' | 'profit' | 'max_drawdown' | 'win_rate' | 'consecutive_wins' | 'risk_reward' | 'no_overtrading' | 'stop_loss_limit';
  target_value: number;
  condition?: 'gt' | 'lt' | 'eq'; // greater than, less than, equal
}

export const DAILY_TEMPLATES: ChallengeTemplate[] = [
  // Behavioral (Discipline)
  {
    id: 'd_b_1',
    type: 'behavioral',
    frequency: 'daily',
    title: 'Disciplined Trader',
    description: 'Execute exactly 3 trades today (no overtrading)',
    base_reward_usdt: 50,
    base_reward_xp: 25,
    target_metric: 'trades_count',
    target_value: 3,
    condition: 'eq'
  },
  {
    id: 'd_b_2',
    type: 'behavioral',
    frequency: 'daily',
    title: 'Risk Manager',
    description: 'Keep your max drawdown under 1% today',
    base_reward_usdt: 75,
    base_reward_xp: 40,
    target_metric: 'max_drawdown',
    target_value: 1, // 1%
    condition: 'lt'
  },
  {
    id: 'd_b_3',
    type: 'behavioral',
    frequency: 'daily',
    title: 'Stop Loss Respect',
    description: 'Do not hit more than 2 Stop Losses today',
    base_reward_usdt: 60,
    base_reward_xp: 30,
    target_metric: 'stop_loss_limit',
    target_value: 2,
    condition: 'lt'
  },
  {
    id: 'd_b_4',
    type: 'behavioral',
    frequency: 'daily',
    title: 'Sniper Entry',
    description: 'Close a trade with at least 1% profit',
    base_reward_usdt: 100,
    base_reward_xp: 50,
    target_metric: 'profit', // Simplified for demo
    target_value: 1, 
    condition: 'gt'
  },
  // Skill (Technique)
  {
    id: 'd_s_1',
    type: 'skill',
    frequency: 'daily',
    title: 'Profit Maker',
    description: 'Achieve a total profit of $500 today',
    base_reward_usdt: 150,
    base_reward_xp: 75,
    target_metric: 'profit',
    target_value: 500,
    condition: 'gt'
  },
  {
    id: 'd_s_2',
    type: 'skill',
    frequency: 'daily',
    title: 'Win Streak',
    description: 'Win 2 trades in a row',
    base_reward_usdt: 120,
    base_reward_xp: 60,
    target_metric: 'consecutive_wins',
    target_value: 2,
    condition: 'gt'
  }
];

export const WEEKLY_TEMPLATES: ChallengeTemplate[] = [
  // Skill-based
  {
    id: 'w_s_1',
    type: 'skill',
    frequency: 'weekly',
    title: 'Consistent Winner',
    description: 'Achieve a Winrate ≥ 55% over 10 trades',
    base_reward_usdt: 500,
    base_reward_xp: 250,
    target_metric: 'win_rate',
    target_value: 55,
    condition: 'gt'
  },
  {
    id: 'w_s_2',
    type: 'skill',
    frequency: 'weekly',
    title: 'High RR Trader',
    description: 'Maintain an average Risk:Reward ratio ≥ 2.0',
    base_reward_usdt: 600,
    base_reward_xp: 300,
    target_metric: 'risk_reward',
    target_value: 2.0,
    condition: 'gt'
  },
  {
    id: 'w_s_3',
    type: 'skill',
    frequency: 'weekly',
    title: 'Weekly Profit',
    description: 'Generate $2000 in profit this week',
    base_reward_usdt: 800,
    base_reward_xp: 400,
    target_metric: 'profit',
    target_value: 2000,
    condition: 'gt'
  },
  {
    id: 'w_s_4',
    type: 'skill',
    frequency: 'weekly',
    title: 'Market Master',
    description: 'Execute 20 trades with positive PnL',
    base_reward_usdt: 700,
    base_reward_xp: 350,
    target_metric: 'trades_count', // Simplified logic, needs refinement in calculation
    target_value: 20,
    condition: 'gt'
  }
];

export const MONTHLY_TEMPLATES: ChallengeTemplate[] = [
  // Strategic (Ultra Only)
  {
    id: 'm_st_1',
    type: 'strategic',
    frequency: 'monthly',
    title: 'Account Growth',
    description: 'Grow account by +5% without drawdown >3%',
    base_reward_usdt: 2000,
    base_reward_xp: 1000,
    target_metric: 'profit', // Complex metric
    target_value: 5000, // Approximate 5% of 100k
    condition: 'gt'
  },
  {
    id: 'm_st_2',
    type: 'strategic',
    frequency: 'monthly',
    title: 'Consistency King',
    description: 'Trade for 20 distinct days this month',
    base_reward_usdt: 2500,
    base_reward_xp: 1250,
    target_metric: 'trades_count', // Proxy for active days
    target_value: 20,
    condition: 'gt'
  },
  {
    id: 'm_st_3',
    type: 'strategic',
    frequency: 'monthly',
    title: 'Master Strategist',
    description: 'Achieve a monthly Winrate > 60% with >50 trades',
    base_reward_usdt: 3000,
    base_reward_xp: 1500,
    target_metric: 'win_rate',
    target_value: 60,
    condition: 'gt'
  }
];

export const getChallengeConfig = (roleInput: string = 'User') => {
  const role = roleInput?.trim();
  
  // Defaults for Free/Pro
  let config = {
    dailyCount: 3,
    weeklyCount: 0,
    monthlyCount: 0,
    rewardMultiplier: 1.0,
    visibleDaily: 5,
    visibleWeekly: 2,
    visibleMonthly: 1
  };

  if (role === 'FinoriGold') {
    config = {
      dailyCount: 4,
      weeklyCount: 1,
      monthlyCount: 0,
      rewardMultiplier: 1.2,
      visibleDaily: 5,
      visibleWeekly: 2,
      visibleMonthly: 1
    };
  } else if (['FinoriUltra', 'FinoriFamily'].includes(role)) {
    config = {
      dailyCount: 5,
      weeklyCount: 2,
      monthlyCount: 1,
      rewardMultiplier: 1.5,
      visibleDaily: 5,
      visibleWeekly: 2,
      visibleMonthly: 1
    };
  }

  return config;
};

// Seeded random number generator for consistent challenges per day/week/month
const seededRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

export const generateChallenges = (dateStr: string, type: 'daily' | 'weekly' | 'monthly') => {
  // Create a seed from the date string (e.g., "2024-01-28")
  const seed = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  let templates = DAILY_TEMPLATES;
  let count = 5; // Generate max possible to show locked ones

  if (type === 'weekly') {
    templates = WEEKLY_TEMPLATES;
    count = 2;
  } else if (type === 'monthly') {
    templates = MONTHLY_TEMPLATES;
    count = 1;
  }

  // Shuffle and pick
  const shuffled = [...templates].sort(() => 0.5 - seededRandom(seed));
  // Ensure we cycle through templates if we don't have enough unique ones for the count
  const result = [];
  for(let i=0; i<count; i++) {
      result.push(shuffled[i % shuffled.length]);
  }
  
  return result;
};
