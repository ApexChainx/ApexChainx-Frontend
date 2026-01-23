export interface SLAResult {
  outage_id: string;
  status: "met" | "violated";
  mttr_minutes: number;
  threshold_minutes: number;
  amount: number; // negative = penalty, positive = reward
  payment_type: "reward" | "penalty";
  rating: "exceptional" | "excellent" | "good" | "poor";
}
