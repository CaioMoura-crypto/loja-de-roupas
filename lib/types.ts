export type Category = { id: string; name: string; slug: string; description: string; image: string; visible: boolean };
export type Variant = { id: string; size: string; color: string; colorHex: string; stock: number };
export type Product = {
  id: string; slug: string; name: string; categoryId: string; price: number; compareAtPrice: number;
  description: string; details: string; composition: string; care: string;
  images: string[]; variants: Variant[]; featured: boolean; active: boolean; badge: string;
};
export type Settings = {
  catalogIsDemo: boolean;
  homeCategoryIds: string[];
  fabricEnabled: boolean; fabricColor: string; fabricIntensity: number; fabricMode: 'scroll' | 'loop';
  brandName: string; tagline: string; announcement: string;
  heroEyebrow: string; heroTitle: string; heroDescription: string; heroImage: string; heroButton: string;
  editorialTitle: string; editorialText: string; editorialImage: string;
  locationEnabled: boolean; locationTitle: string; locationDescription: string;
  locationAddress: string; locationHours: string; locationMapsUrl: string; locationMapCenter: string;
  footerText: string; contactEmail: string; whatsapp: string; instagram: string;
  themeColors: Record<string, string>;
  legalName: string; taxId: string; businessAddress: string; privacyEmail: string;
  privacyPolicy: string; purchaseTerms: string; returnsPolicy: string;
  accentColor: string; backgroundColor: string; shippingNote: string; returnsNote: string;
};
export type SiteContent = { schemaVersion: 1; revision: number; settings: Settings; categories: Category[]; products: Product[] };
export type CartItem = { productId: string; variantId: string; quantity: number };
export type Order = {
  id: string; createdAt: string; status: 'pending' | 'contacted' | 'completed' | 'cancelled';
  customer: { name: string; email: string; phone: string; notes: string };
  items: { productId: string; variantId: string; name: string; size: string; color: string; quantity: number; unitPrice: number }[];
  total: number;
};
