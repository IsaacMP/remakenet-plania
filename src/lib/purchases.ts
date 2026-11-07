// Pagos de Plania Pro — PREPARADO, todavía no activo.
//
// Cuando se activen los pagos:
//   1. npx expo install react-native-purchases   (RevenueCat: maneja App Store y Google Play)
//   2. En RevenueCat crear el entitlement "pro" y los productos plania_pro_monthly / plania_pro_yearly
//   3. Llamar a configurePurchases(userId) al iniciar sesión, con el id de Supabase como App User ID
//   4. Desplegar supabase/functions/revenuecat-webhook: es el servidor quien da o quita Pro,
//      la app solo lee profiles.plan
//   5. Cambiar PURCHASES_ENABLED a true
//
// Mientras tanto, el botón "Quiero Pro" abre la lista de espera con el cupón de 65%.

export const PURCHASES_ENABLED = false;

export type ProPackage = 'monthly' | 'yearly';

export async function configurePurchases(_userId: string): Promise<void> {
  if (!PURCHASES_ENABLED) return;
  // Purchases.configure({ apiKey: Platform.select({ ios: IOS_KEY, android: ANDROID_KEY })!, appUserID: userId });
}

export async function buyPro(_pkg: ProPackage): Promise<'purchased' | 'cancelled' | 'unavailable'> {
  if (!PURCHASES_ENABLED) return 'unavailable';
  // const offerings = await Purchases.getOfferings();
  // const pkg = offerings.current?.[pkg === 'monthly' ? 'monthly' : 'annual'];
  // await Purchases.purchasePackage(pkg); — el webhook actualiza el plan en Supabase
  return 'unavailable';
}

export async function restorePurchases(): Promise<void> {
  if (!PURCHASES_ENABLED) return;
  // await Purchases.restorePurchases();
}
