export interface Plan {
  name: string;
  reviewsPerMonth: number;
}

export const PLANS: Record<string, Plan> = {
  free: { name: "Free", reviewsPerMonth: 5 },
  pro: { name: "Pro", reviewsPerMonth: Infinity },
  team: { name: "Team", reviewsPerMonth: Infinity },
};

export function getReviewLimit(plan: string): number {
  return PLANS[plan]?.reviewsPerMonth ?? PLANS.free.reviewsPerMonth;
}
