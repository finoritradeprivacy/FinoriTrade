import { SpeedInsights } from "@vercel/speed-insights/react";

/**
 * SpeedInsights component wrapper
 * 
 * This component integrates Vercel Speed Insights into the application.
 * Speed Insights provides real-time performance metrics for your application.
 * 
 * For more information, visit: https://vercel.com/docs/speed-insights
 */
export function WebVitals() {
  return <SpeedInsights />;
}
