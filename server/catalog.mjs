const stores = [{ id: 'zona-parts', name: 'ZONA Parts', city: 'Скопје', pickup: true, status: 'APPROVED' }]
const products = [
  { id: 'master-brembo-0997721x', name: 'Brembo Xtra кочионен диск', brand: 'Brembo', partNumber: '09.9772.1X', category: 'Сопирачки', offers: [{ storeId: 'zona-parts', price: 3190, stock: 8 }] },
  { id: 'master-mann-c35154', name: 'MANN-FILTER воздушен филтер', brand: 'MANN-FILTER', partNumber: 'C 35 154', category: 'Филтри', offers: [{ storeId: 'zona-parts', price: 890, stock: 12 }] },
  { id: 'master-bosch-s5a080', name: 'Bosch AGM акумулатор', brand: 'Bosch', partNumber: '0 092 S5A 080', category: 'Електрика', offers: [{ storeId: 'zona-parts', price: 11890, stock: 4 }] },
  { id: 'castrol-edge', name: 'Castrol EDGE 5W-30 · 5L', brand: 'Castrol', partNumber: '15B4D3', category: 'Мотор', offers: [{ storeId: 'zona-parts', price: 2890, stock: 15 }] },
  { id: 'sachs-314717', name: 'SACHS преден амортизер', brand: 'SACHS', partNumber: '314 717', category: 'Суспензија', offers: [{ storeId: 'zona-parts', price: 7490, stock: 6 }] },
  { id: 'brembo-pads', name: 'Brembo кочиони плочки', brand: 'Brembo', partNumber: 'P 85 020', category: 'Сопирачки', offers: [{ storeId: 'zona-parts', price: 2190, stock: 10 }] },
]

export function searchCatalog(query = '') {
  const q = query.trim().toLowerCase()
  return products.filter((product) => !q || [product.name, product.brand, product.partNumber, product.category].join(' ').toLowerCase().includes(q)).map(withOffers)
}

export function getProduct(id) {
  const product = products.find((item) => item.id === id)
  return product ? withOffers(product) : null
}

export function getStores() {
  return stores
}

export function updateStoreStatus(storeId, status) {
  const store = stores.find((item) => item.id === storeId)
  if (!store) return null
  store.status = status
  return store
}

export function getAdminOverview() {
  return { users: 1248, activeStores: stores.filter((store) => store.status === 'APPROVED').length, pendingStores: stores.filter((store) => store.status === 'PENDING_APPROVAL').length, masterProducts: 12840, activeOffers: 43620, ordersToday: 38, zeroResultSearches: 12 }
}

export function getOffersForStore(storeId) {
  return products.flatMap((product) => product.offers.filter((offer) => offer.storeId === storeId).map((offer) => ({ productId: product.id, productName: product.name, brand: product.brand, partNumber: product.partNumber, price: offer.price, stock: offer.stock, active: true })))
}

export function findOffer(productId, storeId) {
  const product = products.find((item) => item.id === productId)
  const offer = product?.offers.find((item) => item.storeId === storeId)
  return product && offer ? { product, offer, store: stores.find((store) => store.id === storeId) } : null
}

function withOffers(product) {
  return { ...product, offers: product.offers.map((offer) => ({ ...offer, store: stores.find((store) => store.id === offer.storeId) })) }
}
