export type UserRole = 'CUSTOMER' | 'SELLER' | 'ADMIN'
export type CompatibilityStatus = 'FIT' | 'UNKNOWN' | 'DOES_NOT_FIT'
export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REJECTED'

export type VehicleSummary = { id: string; make: string; model: string; generation: string; year: number; engine: string; fuel: string; powerHp?: number }
export type SellerOfferSummary = { id: string; storeId: string; storeName: string; city: string; price: number; stock: number; deliveryAvailable: boolean; pickupAvailable: boolean; preparationMinutes: number }
export type ProductSearchResult = { id: string; name: string; brand: string; manufacturerPartNumber: string; category: string; compatibility: CompatibilityStatus; offers: SellerOfferSummary[] }

export type ParentOrder = { id: string; status: OrderStatus; total: number; sellerOrders: SellerOrder[] }
export type SellerOrder = { id: string; storeId: string; storeName: string; subtotal: number; deliveryFee: number; total: number; status: OrderStatus; deliveryType: 'SELLER_DELIVERY' | 'PICKUP' }
