import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting price history generation...');

    // Fetch all active assets
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, symbol, current_price, asset_type')
      .eq('is_active', true);

    if (assetsError) {
      throw new Error(`Failed to fetch assets: ${assetsError.message}`);
    }

    console.log(`Found ${assets.length} active assets`);

    const now = Math.floor(Date.now() / 1000);
    const DAYS_TO_GENERATE = 30;
    const MINUTES_PER_DAY = 1440;
    const TOTAL_CANDLES = DAYS_TO_GENERATE * MINUTES_PER_DAY; // 43200 candles per asset
    const BATCH_SIZE = 1000;

    for (const asset of assets) {
      console.log(`Generating history for ${asset.symbol}...`);

      // Check existing data
      const { data: existingData, error: existingError } = await supabase
        .from('price_history')
        .select('time')
        .eq('asset_id', asset.id)
        .order('time', { ascending: false })
        .limit(1);

      if (existingError) {
        console.error(`Error checking existing data for ${asset.symbol}:`, existingError);
        continue;
      }

      // Start from the earliest time we need
      const startTime = now - (TOTAL_CANDLES * 60);
      
      // Determine volatility based on asset type
      let volatility = 0.0005; // Base volatility (0.05%)
      if (asset.asset_type === 'crypto') {
        volatility = 0.002; // 0.2% for crypto
      } else if (asset.asset_type === 'stocks') {
        volatility = 0.001; // 0.1% for stocks
      } else if (asset.asset_type === 'forex') {
        volatility = 0.0003; // 0.03% for forex
      }

      // Generate candles going backward from now
      let currentPrice = Number(asset.current_price);
      const candles: any[] = [];

      // First, walk backward to establish prices at each minute
      const priceHistory: number[] = new Array(TOTAL_CANDLES + 1);
      priceHistory[TOTAL_CANDLES] = currentPrice; // End at current price

      // Generate random walk backward
      for (let i = TOTAL_CANDLES - 1; i >= 0; i--) {
        const priceChange = priceHistory[i + 1] * volatility * (Math.random() * 2 - 1);
        priceHistory[i] = Math.max(priceHistory[i + 1] - priceChange, 0.0001);
      }

      // Now generate OHLC candles
      for (let i = 0; i < TOTAL_CANDLES; i++) {
        const candleTime = startTime + (i * 60);
        const open = priceHistory[i];
        const close = priceHistory[i + 1];
        
        // Generate high/low within the range
        const range = Math.abs(close - open) + (open * volatility * Math.random());
        const high = Math.max(open, close) + (range * Math.random() * 0.5);
        const low = Math.min(open, close) - (range * Math.random() * 0.5);

        candles.push({
          asset_id: asset.id,
          time: candleTime,
          open: Number(open.toFixed(8)),
          high: Number(high.toFixed(8)),
          low: Number(Math.max(low, 0.0001).toFixed(8)),
          close: Number(close.toFixed(8))
        });
      }

      // Insert in batches
      let insertedCount = 0;
      for (let i = 0; i < candles.length; i += BATCH_SIZE) {
        const batch = candles.slice(i, i + BATCH_SIZE);
        
        const { error: insertError } = await supabase
          .from('price_history')
          .upsert(batch, { 
            onConflict: 'asset_id,time',
            ignoreDuplicates: true 
          });

        if (insertError) {
          console.error(`Error inserting batch for ${asset.symbol}:`, insertError);
        } else {
          insertedCount += batch.length;
        }
      }

      console.log(`Inserted ${insertedCount} candles for ${asset.symbol}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Generated ${DAYS_TO_GENERATE} days of price history for ${assets.length} assets` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating price history:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
