// Shared type definitions for the application

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string | null;
  price: number;
  salePrice?: number | null;
  mainImage: string;
  images?: string | null;
  brand?: string | null;
  categoryId: string;
  category?: Category;
  inStock: boolean;
  stockQuantity: number;
  featured: boolean;
  onSale: boolean;
  isActive: boolean;
  rating?: number;
  reviewCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  parentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  variantId?: string | null;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  id: string;
  productId: string;
  rating: number;
  title?: string | null;
  comment: string;
  reviewerName: string;
  isApproved: boolean;
  isVerifiedPurchase: boolean;
  createdAt: Date;
}
