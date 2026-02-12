import { Platform } from "react-native";
import Constants from "expo-constants";
import type { BuilderSubscription } from "../auth/storage";

const DEFAULT_IOS_API_KEY = "test_TrMdLOfNQKBZCijjWzKpajqqEeE";
const DEFAULT_ENTITLEMENT = "LabourLink Pro";
const DEFAULT_MONTHLY_PACKAGE_IDS = ["$rc_monthly", "monthly"];
const DEFAULT_YEARLY_PACKAGE_IDS = ["$rc_annual", "$rc_yearly", "yearly"];

type RevenueCatProduct = {
  id: string;
  title: string;
  priceString: string;
  packageType: "monthly" | "yearly" | "other";
};

type PaywallPurchaseResult = {
  paywallResult: string;
  subscription: BuilderSubscription;
};

let configuredForUser: string | null = null;

function entitlementId() {
  return (process.env.EXPO_PUBLIC_RC_ENTITLEMENT || DEFAULT_ENTITLEMENT).trim();
}

function isIos() {
  return Platform.OS === "ios";
}

function isExpoGoRuntime() {
  return Constants.appOwnership === "expo";
}

function loadPurchasesModule(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("react-native-purchases");
    return mod?.default || mod;
  } catch {
    return null;
  }
}

function loadPurchasesUiModule(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("react-native-purchases-ui");
    return mod?.default || mod;
  } catch {
    return null;
  }
}

function selectEntitlement(customerInfo: any): any {
  const id = entitlementId();
  const active = customerInfo?.entitlements?.active || {};
  const all = customerInfo?.entitlements?.all || {};

  if (id && active[id]) return active[id];
  if (id && all[id]) return all[id];

  const aliases = [DEFAULT_ENTITLEMENT, "labourlink_pro", "pro"];
  for (const key of aliases) {
    if (active[key]) return active[key];
    if (all[key]) return all[key];
  }

  const lower = id.toLowerCase();
  const activeMatch = Object.entries(active).find(([k]) => k.toLowerCase() === lower)?.[1];
  if (activeMatch) return activeMatch;
  const allMatch = Object.entries(all).find(([k]) => k.toLowerCase() === lower)?.[1];
  if (allMatch) return allMatch;

  return Object.values(active)[0] || Object.values(all)[0] || null;
}

export function customerInfoToSubscription(customerInfo: any): BuilderSubscription {
  const entitlement = selectEntitlement(customerInfo);
  const isActive = Boolean(entitlement?.isActive);
  const periodType = String(entitlement?.periodType || "").toLowerCase();
  const expirationDate = entitlement?.expirationDate || entitlement?.expiresDate || null;

  let status: BuilderSubscription["status"] = "past_due";
  if (isActive) {
    status = periodType === "trial" || periodType === "intro" ? "trial" : "active";
  } else if (expirationDate) {
    const expMs = new Date(String(expirationDate)).getTime();
    status = Number.isFinite(expMs) && expMs < Date.now() ? "past_due" : "cancelled";
  } else {
    status = "cancelled";
  }

  return {
    planName: "LabourLink Pro",
    status,
    monthlyPrice: 50,
    renewalDate: expirationDate ? String(expirationDate) : null,
  };
}

export async function configureRevenueCat(email: string): Promise<any> {
  if (!isIos()) throw new Error("Apple subscriptions are only available on iOS.");
  if (isExpoGoRuntime()) {
    throw new Error(
      "Subscriptions require a development build or TestFlight. Expo Go does not support RevenueCat paywalls."
    );
  }
  const Purchases = loadPurchasesModule();
  if (!Purchases) {
    throw new Error("RevenueCat SDK not found. Install react-native-purchases and rebuild iOS.");
  }

  const apiKey = (process.env.EXPO_PUBLIC_RC_API_KEY_IOS || DEFAULT_IOS_API_KEY).trim();
  if (!apiKey) throw new Error("Missing RevenueCat iOS API key.");

  if (configuredForUser === email) return Purchases;

  if (Purchases.LOG_LEVEL?.DEBUG && typeof Purchases.setLogLevel === "function") {
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
  }
  await Purchases.configure({ apiKey, appUserID: email });
  configuredForUser = email;
  return Purchases;
}

export async function getRevenueCatCustomerInfo(email: string): Promise<any> {
  const Purchases = await configureRevenueCat(email);
  return Purchases.getCustomerInfo();
}

export async function getRevenueCatProducts(email: string): Promise<RevenueCatProduct[]> {
  const Purchases = await configureRevenueCat(email);
  const offerings = await Purchases.getOfferings();
  const current = offerings?.current;
  if (!current?.availablePackages?.length) return [];

  return current.availablePackages.map((pkg: any) => {
    const id = String(pkg?.identifier || "");
    const idLower = id.toLowerCase();
    const packageType: RevenueCatProduct["packageType"] = DEFAULT_MONTHLY_PACKAGE_IDS.includes(idLower)
      ? "monthly"
      : DEFAULT_YEARLY_PACKAGE_IDS.includes(idLower)
        ? "yearly"
        : idLower.includes("month")
          ? "monthly"
          : idLower.includes("year") || idLower.includes("annual")
            ? "yearly"
            : "other";

    return {
      id,
      title: String(pkg?.storeProduct?.title || id),
      priceString: String(pkg?.storeProduct?.priceString || ""),
      packageType,
    };
  });
}

export async function presentRevenueCatPaywall(email: string): Promise<PaywallPurchaseResult> {
  await configureRevenueCat(email);
  const RevenueCatUI = loadPurchasesUiModule();
  if (!RevenueCatUI) {
    throw new Error("RevenueCat Paywalls SDK not found. Install react-native-purchases-ui and rebuild iOS.");
  }

  const result = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: entitlementId(),
    displayCloseButton: true,
  });
  const customerInfo = await getRevenueCatCustomerInfo(email);

  return {
    paywallResult: String(result || ""),
    subscription: customerInfoToSubscription(customerInfo),
  };
}

export async function restoreRevenueCatPurchases(email: string): Promise<BuilderSubscription> {
  const Purchases = await configureRevenueCat(email);
  const customerInfo = await Purchases.restorePurchases();
  return customerInfoToSubscription(customerInfo);
}

export async function openRevenueCatCustomerCenter(email: string): Promise<void> {
  await configureRevenueCat(email);
  const RevenueCatUI = loadPurchasesUiModule();
  if (!RevenueCatUI) {
    throw new Error("RevenueCat Customer Center requires react-native-purchases-ui.");
  }
  await RevenueCatUI.presentCustomerCenter();
}
