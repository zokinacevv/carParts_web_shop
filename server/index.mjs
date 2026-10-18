import { createServer } from 'node:http'
import { getRequestCatalog } from './catalog-provider.mjs'
import { createQuote, readQuote, canReadQuote, publicQuote, saveQuote, validateQuote } from './quotes.mjs'
import { findOffer, getAdminOverview, getOffersForStore, getProduct, getStores, searchCatalog, updateStoreStatus } from './catalog.mjs'
import { isRateLimited, requestId, securityHeaders } from './security.mjs'
import { login, register, requireRole, sessionFromRequest } from './auth.mjs'

const port = Number(process.env.API_PORT || 4000)
const cart = new Map()

const send = (response, status, payload) => {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': process.env.WEB_ORIGIN || 'http://127.0.0.1:5174', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,authorization' })
  response.end(JSON.stringify(payload))
}

const readJson = (request) => new Promise((resolve, reject) => {
  let body = ''
  request.on('data', (chunk) => { body += chunk; if (body.length > 65536) { reject(new Error('Payload too large')); request.destroy() } })
  request.on('end', () => { try { resolve(body ? JSON.parse(body) : {}) } catch { reject(new Error('Invalid JSON')) } })
  request.on('error', reject)
})

const server = createServer(async (request, response) => {
  const id = requestId()
  securityHeaders(response, id)
  if (isRateLimited(request.socket.remoteAddress || 'local')) return send(response, 429, { error: 'Too many requests', requestId: id })
  if (request.method === 'OPTIONS') return send(response, 204, {})
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  const parts = url.pathname.split('/').filter(Boolean)

  if (parts[0] !== 'api' || parts[1] !== 'v1') return send(response, 404, { error: 'Route not found' })
  if (['vehicles', 'part-groups'].includes(parts[2]) && request.method === 'GET') {
    try { const catalog = await getRequestCatalog(); return send(response, 200, { data: parts[2] === 'vehicles' ? catalog.makes : catalog.partGroups, meta: catalog.meta, ...(parts[2] === 'vehicles' ? { submodels: catalog.submodels } : {}) }) }
    catch { return send(response, 503, { error: 'Каталогот од добавувачот моментално не е достапен. Можеш да внесеш модел и дел рачно.' }) }
  }
  if (parts[2] === 'quotes') {
    response.setHeader('cache-control', 'no-store')
    try {
      if (request.method === 'POST' && !parts[3]) {
        const input = await readJson(request)
        try { validateQuote(input) } catch (error) { return send(response, 422, { error: error.message }) }
        return send(response, 201, { data: await createQuote(input) })
      }
      const record = await readQuote(parts[3] || '')
      const authorization = request.headers.authorization || ''
      if (!record || !canReadQuote(record, authorization.startsWith('Bearer ') ? authorization.slice(7) : '')) return send(response, 404, { error: 'Барањето не е пронајдено или кодот за пристап е неточен.' })
      if (request.method === 'GET' && !parts[4]) return send(response, 200, { data: publicQuote(record) })
      if (request.method === 'POST' && parts[4] === 'accept') {
        if (record.status !== 'OFFERED' || !record.offer || Date.parse(record.offer.validUntil) < Date.now()) return send(response, 409, { error: 'Понудата не е активна или веќе е прифатена.' })
        record.status = 'ACCEPTED'; record.acceptedAt = new Date().toISOString()
        await saveQuote(record)
        return send(response, 200, { data: publicQuote(record) })
      }
      return send(response, 404, { error: 'Route not found' })
    } catch (error) {
      console.error('Quote operation failed:', error.code || error.name)
      return send(response, 500, { error: 'Барањето не е зачувано. Обиди се повторно.' })
    }
  }
  if (parts[2] === 'health') return send(response, 200, { ok: true, service: 'zona-parts-api', version: 'v1', requestId: id })
  if (parts[2] === 'auth' && parts[3] === 'register' && request.method === 'POST') { try { const result = await register(await readJson(request)); return result.error ? send(response, 409, { error: result.error }) : send(response, 201, result) } catch { return send(response, 400, { error: 'Invalid registration payload' }) } }
  if (parts[2] === 'auth' && parts[3] === 'login' && request.method === 'POST') { try { const result = await login(await readJson(request)); return result.error ? send(response, 401, { error: result.error }) : send(response, 200, result) } catch { return send(response, 400, { error: 'Invalid login payload' }) } }
  if (parts[2] === 'auth' && parts[3] === 'me' && request.method === 'GET') { const session = sessionFromRequest(request); return session ? send(response, 200, { data: session }) : send(response, 401, { error: 'Authentication required' }) }
  if (parts[2] === 'search') return send(response, 200, { data: searchCatalog(url.searchParams.get('q') || ''), meta: { query: url.searchParams.get('q') || '', count: searchCatalog(url.searchParams.get('q') || '').length } })
  if (parts[2] === 'products' && parts[3]) {
    const product = getProduct(parts[3])
    return product ? send(response, 200, { data: product }) : send(response, 404, { error: 'Product not found' })
  }
  if (parts[2] === 'stores') return send(response, 200, { data: getStores() })
  if (parts[2] === 'admin') { const access = requireRole(request, 'ADMIN'); if (access.error) return send(response, access.status, { error: access.error }); if (parts[3] === 'overview' && request.method === 'GET') return send(response, 200, { data: getAdminOverview() }); if (parts[3] === 'stores' && request.method === 'GET') return send(response, 200, { data: getStores() }); }
  if (parts[2] === 'admin' && parts[3] === 'stores' && parts[4] && parts[5] === 'status' && request.method === 'PATCH') {
    const access = requireRole(request, 'ADMIN')
    if (access.error) return send(response, access.status, { error: access.error })
    try {
      const input = await readJson(request)
      if (!['APPROVED', 'REJECTED', 'SUSPENDED', 'PENDING_APPROVAL'].includes(input.status)) return send(response, 422, { error: 'Invalid seller status' })
      const store = updateStoreStatus(parts[4], input.status)
      return store ? send(response, 200, { data: store }) : send(response, 404, { error: 'Store not found' })
    } catch { return send(response, 400, { error: 'Invalid status payload' }) }
  }
  if (parts[2] === 'seller') { const access = requireRole(request, 'SELLER'); if (access.error) return send(response, access.status, { error: access.error }); const storeId = request.headers['x-store-id']; if (!storeId) return send(response, 422, { error: 'x-store-id header is required' }); if (parts[3] === 'overview' && request.method === 'GET') return send(response, 200, { data: { storeId, todayOrders: 0, todayRevenue: 0, activeOffers: getOffersForStore(storeId).length, lowStock: getOffersForStore(storeId).filter((offer) => offer.stock <= 2).length, views: 0 } }); if (parts[3] === 'offers' && request.method === 'GET') return send(response, 200, { data: getOffersForStore(storeId) }); }
  if (parts[2] === 'cart' && request.method === 'GET') return send(response, 200, { data: [...cart.values()] })
  if (parts[2] === 'cart' && parts[3] === 'items' && request.method === 'POST') {
    try {
      const input = await readJson(request)
      const match = findOffer(input.productId, input.storeId)
      if (!match) return send(response, 404, { error: 'Offer not found' })
      const quantity = Math.max(1, Number(input.quantity || 1))
      if (quantity > match.offer.stock) return send(response, 409, { error: 'Insufficient stock' })
      const key = `${input.productId}:${input.storeId}`
      cart.set(key, { key, productId: input.productId, storeId: input.storeId, productName: match.product.name, storeName: match.store.name, unitPrice: match.offer.price, quantity })
      return send(response, 201, { data: [...cart.values()] })
    } catch { return send(response, 400, { error: 'Invalid cart payload' }) }
  }
  if (parts[2] === 'orders' && request.method === 'POST') {
    try {
      const input = await readJson(request)
      const customer = input.customer
      const sellerOrder = input.sellerOrders?.[0]
      if (!customer?.name?.trim() || !customer?.phone?.trim() || input.sellerOrders?.length !== 1 || sellerOrder?.storeId !== 'zona-parts' || !sellerOrder.items?.length) return send(response, 422, { error: 'Внеси име, телефон и производи за нарачката.' })
      if (!['DELIVERY', 'PICKUP'].includes(sellerOrder.deliveryType)) return send(response, 422, { error: 'Невалиден начин на преземање.' })
      if (sellerOrder.deliveryType === 'DELIVERY' && (!customer.address?.trim() || !customer.city?.trim())) return send(response, 422, { error: 'Внеси адреса и град за достава.' })
      const seen = new Set()
      const items = []
      for (const item of sellerOrder.items) {
        const match = findOffer(item.productId, 'zona-parts')
        if (!match || seen.has(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1) return send(response, 422, { error: 'Невалиден производ или количина.' })
        if (item.quantity > match.offer.stock) return send(response, 409, { error: `Недоволна залиха: ${match.product.name}` })
        seen.add(item.productId)
        items.push({ productId: item.productId, productName: match.product.name, unitPrice: match.offer.price, quantity: item.quantity })
      }
      const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
      const deliveryFee = sellerOrder.deliveryType === 'PICKUP' ? 0 : 150
      for (const item of items) findOffer(item.productId, 'zona-parts').offer.stock -= item.quantity
      return send(response, 201, { data: { id: `ZONA-${id}`, status: 'PENDING', customer, subtotal, deliveryFee, total: subtotal + deliveryFee, sellerOrders: [{ storeId: 'zona-parts', storeName: 'ZONA Parts', subtotal, deliveryFee, deliveryType: sellerOrder.deliveryType, items }] } })
    } catch { return send(response, 400, { error: 'Invalid order payload' }) }
  }
  return send(response, 404, { error: 'Route not found' })
})

server.listen(port, '127.0.0.1', () => console.log(`ZONA Parts API listening on http://127.0.0.1:${server.address().port}`))
