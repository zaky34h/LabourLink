import { apiRequest } from "../api/client";
import type { BuilderSubscription } from "../auth/storage";
import {
  getRevenueCatCustomerInfo,
  getRevenueCatProducts,
  openRevenueCatCustomerCenter,
  presentRevenueCatPaywall,
  restoreRevenueCatPurchases,
  customerInfoToSubscription,
} from "./purchases";

export async function getSubscriptionStatus(): Promise<BuilderSubscription> {
  const res = await apiRequest<{ ok: true; subscription: BuilderSubscription }>("/subscription", {
    auth: true,
  });
  return res.subscription;
}

export async function startFreeTrial(): Promise<BuilderSubscription> {
  const res = await apiRequest<{ ok: true; subscription: BuilderSubscription }>(
    "/subscription/start-trial",
    { method: "POST", auth: true }
  );
  return res.subscription;
}

export async function activatePaidSubscription(): Promise<BuilderSubscription> {
  const res = await apiRequest<{ ok: true; subscription: BuilderSubscription }>(
    "/subscription/activate",
    { method: "POST", auth: true }
  );
  return res.subscription;
}

export async function cancelSubscription(): Promise<BuilderSubscription> {
  const res = await apiRequest<{ ok: true; subscription: BuilderSubscription }>(
    "/subscription/cancel",
    { method: "POST", auth: true }
  );
  return res.subscription;
}

export async function syncSubscription(
  subscription: BuilderSubscription
): Promise<BuilderSubscription> {
  const res = await apiRequest<{ ok: true; subscription: BuilderSubscription }>("/subscription/sync", {
    method: "POST",
    auth: true,
    body: subscription,
  });
  return res.subscription;
}

export async function startAppleSubscriptionFlow(email: string): Promise<BuilderSubscription> {
  const paywall = await presentRevenueCatPaywall(email);
  return syncSubscription(paywall.subscription);
}

export async function restoreAppleSubscriptionFlow(email: string): Promise<BuilderSubscription> {
  const local = await restoreRevenueCatPurchases(email);
  return syncSubscription(local);
}

export async function refreshSubscriptionFromRevenueCat(email: string): Promise<BuilderSubscription> {
  const info = await getRevenueCatCustomerInfo(email);
  return syncSubscription(customerInfoToSubscription(info));
}

export async function getSubscriptionProducts(email: string) {
  return getRevenueCatProducts(email);
}

export async function openSubscriptionCustomerCenter(email: string): Promise<void> {
  await openRevenueCatCustomerCenter(email);
}

export function hasActiveSubscriptionAccess(subscription?: BuilderSubscription | null): boolean {
  if (!subscription) return false;
  if (subscription.status !== "trial" && subscription.status !== "active") return false;
  if (!subscription.renewalDate) return false;
  const renewal = new Date(subscription.renewalDate).getTime();
  return Number.isFinite(renewal) && renewal > Date.now();
}
