/**
 * RevenueCat configuration and helpers for TubeRush
 * @see https://www.revenuecat.com/docs/getting-started/installation/reactnative
 */

import Purchases, { PurchasesPackage } from 'react-native-purchases';

/** Entitlement identifier - must match RevenueCat dashboard */
export const ENTITLEMENT_ID = 'TubeRush Pro';

/** Product identifiers - configure in RevenueCat dashboard */
export const PRODUCT_ID_MONTHLY = 'monthly';
export const PRODUCT_ID_YEARLY = 'yearly';

/** True only after configure() succeeds. False when native module unavailable (Expo Go, web). */
let configured = false;

/** Get RevenueCat API key from env */
export function getRevenueCatApiKey(): string | undefined {
  return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
}

/** Check if RevenueCat is configured and native module is available */
export function isRevenueCatConfigured(): boolean {
  return configured;
}

/** Configure RevenueCat SDK - call once on app launch. No-op if API key missing or native module unavailable (Expo Go, web). */
export async function configureRevenueCat(appUserId?: string): Promise<boolean> {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    if (__DEV__) {
      console.warn('[RevenueCat] EXPO_PUBLIC_REVENUECAT_API_KEY not set, skipping configure');
    }
    return false;
  }

  try {
    await Purchases.configure({
      apiKey,
      appUserID: appUserId ?? undefined,
    });
    configured = true;
    return true;
  } catch (e) {
    if (__DEV__) {
      console.warn('[RevenueCat] Native module unavailable (Expo Go/web?). Use a development build for IAP.');
    }
    return false;
  }
}

/** Log in existing RevenueCat user (call after Supabase auth) */
export async function logInRevenueCat(appUserId: string): Promise<void> {
  if (!isRevenueCatConfigured()) return;
  const { customerInfo } = await Purchases.logIn(appUserId);
  if (__DEV__) {
    console.log('[RevenueCat] Logged in:', customerInfo.originalAppUserId);
  }
}

/** Log out RevenueCat user (call on sign out) */
export async function logOutRevenueCat(): Promise<void> {
  if (!isRevenueCatConfigured()) return;
  await Purchases.logOut();
}

/** Check if user has TubeRush Pro entitlement */
export async function hasActiveEntitlement(): Promise<boolean> {
  if (!isRevenueCatConfigured()) return false;
  const customerInfo = await Purchases.getCustomerInfo();
  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
  return entitlement?.isActive ?? false;
}

/** Get customer info for display and debugging */
export async function getCustomerInfo() {
  if (!isRevenueCatConfigured()) return null;
  return Purchases.getCustomerInfo();
}

/** Get current offerings (products/packages) */
export async function getOfferings() {
  if (!isRevenueCatConfigured()) return null;
  return Purchases.getOfferings();
}

/** Purchase a package (e.g. monthly or yearly) */
export async function purchasePackage(pkg: PurchasesPackage) {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

/** Restore purchases */
export async function restorePurchases() {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo;
}
