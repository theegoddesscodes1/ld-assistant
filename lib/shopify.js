import { kv } from "@vercel/kv";

const API_VERSION = "2026-07";
// Shopify's client-credentials tokens are short-lived (currently ~24h). Refresh
// a bit early so a request never straddles the exact expiry moment.
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export function shopifyConfigured() {
  return !!(
    process.env.SHOPIFY_STORE_DOMAIN &&
    process.env.SHOPIFY_CLIENT_ID &&
    process.env.SHOPIFY_CLIENT_SECRET
  );
}

async function fetchNewAccessToken() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Shopify token request failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  const expiresAt = Date.now() + data.expires_in * 1000 - REFRESH_BUFFER_MS;

  await kv.set("shopifyTokenCache", { accessToken: data.access_token, expiresAt });
  return data.access_token;
}

async function getAccessToken() {
  const cached = await kv.get("shopifyTokenCache");
  if (cached && cached.expiresAt > Date.now()) {
    return cached.accessToken;
  }
  return fetchNewAccessToken();
}

export async function shopifyGraphQL(query) {
  if (!shopifyConfigured()) return null;
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = await getAccessToken();

  const res = await fetch(`https://${domain}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

const ORDERS_QUERY = (since, includeCustomer) => `{
  orders(first: 250, query: "created_at:>='${since}'") {
    edges {
      node {
        id
        createdAt
        totalPriceSet { shopMoney { amount } }
        ${includeCustomer ? "customer { numberOfOrders }" : ""}
        lineItems(first: 10) {
          edges { node { title quantity } }
        }
      }
    }
  }
}`;

export async function getSalesSummary() {
  if (!shopifyConfigured()) return { configured: false, summary: null };

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceIso = since.toISOString();

  // Try with the customer field first (for new-vs-repeat); if the connected
  // app doesn't have the read_customers scope, Shopify errors the whole
  // query rather than just omitting that field — so fall back to the plain
  // query instead of losing sales data entirely over one missing scope.
  let data;
  let hasCustomerData = true;
  try {
    data = await shopifyGraphQL(ORDERS_QUERY(sinceIso, true));
  } catch (e) {
    hasCustomerData = false;
    data = await shopifyGraphQL(ORDERS_QUERY(sinceIso, false));
  }

  const orders = (data?.orders?.edges || []).map((e) => e.node);

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const todayStr = new Date().toISOString().slice(0, 10);

  let revenueLast7Days = 0;
  let ordersLast7Days = 0;
  let revenuePrevious7Days = 0;
  let revenueLast30Days = 0;
  let ordersLast30Days = 0;
  let revenueToday = 0;
  let ordersToday = 0;
  let newCustomerOrders = 0;
  let repeatCustomerOrders = 0;
  const productCounts = {};
  const productCountsLast7 = {};
  const productCountsPrevious7 = {};

  for (const order of orders) {
    const createdAt = new Date(order.createdAt).getTime();
    const amount = parseFloat(order.totalPriceSet?.shopMoney?.amount || "0");
    const isLast7 = createdAt >= sevenDaysAgo;
    const isPrevious7 = createdAt >= fourteenDaysAgo && createdAt < sevenDaysAgo;

    if (createdAt >= thirtyDaysAgo) {
      revenueLast30Days += amount;
      ordersLast30Days += 1;
    }
    if (isLast7) {
      revenueLast7Days += amount;
      ordersLast7Days += 1;
      if (hasCustomerData && order.customer) {
        if (order.customer.numberOfOrders <= 1) newCustomerOrders += 1;
        else repeatCustomerOrders += 1;
      }
    } else if (isPrevious7) {
      revenuePrevious7Days += amount;
    }
    if (order.createdAt.slice(0, 10) === todayStr) {
      revenueToday += amount;
      ordersToday += 1;
    }

    for (const { node: item } of order.lineItems?.edges || []) {
      productCounts[item.title] = (productCounts[item.title] || 0) + item.quantity;
      if (isLast7) productCountsLast7[item.title] = (productCountsLast7[item.title] || 0) + item.quantity;
      else if (isPrevious7) productCountsPrevious7[item.title] = (productCountsPrevious7[item.title] || 0) + item.quantity;
    }
  }

  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title, quantity]) => {
      const last7 = productCountsLast7[title] || 0;
      const previous7 = productCountsPrevious7[title] || 0;
      let momentum = "flat";
      if (last7 > previous7) momentum = "up";
      else if (last7 < previous7) momentum = "down";
      return { title, quantity, momentum };
    });

  return {
    configured: true,
    summary: {
      revenueLast7Days,
      ordersLast7Days,
      revenuePrevious7Days,
      avgOrderValue7d: ordersLast7Days ? revenueLast7Days / ordersLast7Days : 0,
      revenueLast30Days,
      ordersLast30Days,
      revenueToday,
      ordersToday,
      newCustomerOrders: hasCustomerData ? newCustomerOrders : null,
      repeatCustomerOrders: hasCustomerData ? repeatCustomerOrders : null,
      topProducts,
    },
  };
}

export async function getCatalogTitles(limit = 50) {
  if (!shopifyConfigured()) return null;
  const query = `{
    products(first: ${limit}) {
      edges { node { title productType status } }
    }
  }`;
  const data = await shopifyGraphQL(query);
  return (data?.products?.edges || []).map((e) => e.node);
}

// Low-stock alerts — active, inventory-tracked products under the threshold.
export async function getInventoryAlerts(threshold = 5) {
  if (!shopifyConfigured()) return [];
  const query = `{
    products(first: 100, query: "status:active") {
      edges { node { title totalInventory tracksInventory } }
    }
  }`;
  const data = await shopifyGraphQL(query);
  const products = (data?.products?.edges || []).map((e) => e.node);
  return products
    .filter((p) => p.tracksInventory && p.totalInventory <= threshold)
    .sort((a, b) => a.totalInventory - b.totalInventory)
    .map((p) => ({ title: p.title, totalInventory: p.totalInventory }));
}

// Abandoned checkouts in the last N days — count + estimated value. The
// query includes recovered ones too, so completedAt is filtered out here.
// Requires the manage_abandoned_checkouts permission on the connected app;
// stays quietly empty (not broken) if that's not granted.
export async function getAbandonedCheckoutSummary(days = 14) {
  if (!shopifyConfigured()) return { count: 0, value: 0 };
  const since = new Date();
  since.setDate(since.getDate() - days);
  const query = `{
    abandonedCheckouts(first: 50, query: "created_at:>='${since.toISOString()}'") {
      nodes { completedAt totalPriceSet { shopMoney { amount } } }
    }
  }`;
  const data = await shopifyGraphQL(query);
  const nodes = (data?.abandonedCheckouts?.nodes || []).filter((c) => !c.completedAt);
  const value = nodes.reduce((s, c) => s + parseFloat(c.totalPriceSet?.shopMoney?.amount || "0"), 0);
  return { count: nodes.length, value };
}

// Products created since a given ISO date — grounds the newsletter card in
// something real and independently checkable, instead of leaving it
// entirely dependent on the AI cache or the unverified send-detection cron.
export async function getProductsSince(sinceIso) {
  if (!shopifyConfigured()) return [];
  const query = `{
    products(first: 20, query: "created_at:>='${sinceIso}' status:active") {
      edges { node { title } }
    }
  }`;
  const data = await shopifyGraphQL(query);
  return (data?.products?.edges || []).map((e) => e.node.title);
}

// Orders attributed to a specific campaign via UTM matching, since a given
// date. This is the one metric email-open/click stats can't reliably give
// us (that data lives in Shopify's own Messaging admin UI, not the API) —
// UTM-based order attribution is the closest verifiable substitute. Known
// gap, worth knowing about: Shopify doesn't always populate UTM data on
// orders with only one session before checkout, so this will undercount
// rather than overcount. Fully isolated — any failure here (missing field,
// missing scope) returns null rather than touching anything else.
export async function getCampaignAttributedOrders(utmCampaign, sinceIso) {
  if (!shopifyConfigured() || !utmCampaign) return null;
  try {
    const query = `{
      orders(first: 100, query: "created_at:>='${sinceIso}'") {
        edges {
          node {
            totalPriceSet { shopMoney { amount } }
            customerJourneySummary { lastVisit { utmParameters { campaign } } }
          }
        }
      }
    }`;
    const data = await shopifyGraphQL(query);
    const orders = (data?.orders?.edges || []).map((e) => e.node);
    const matched = orders.filter(
      (o) => o.customerJourneySummary?.lastVisit?.utmParameters?.campaign === utmCampaign
    );
    const revenue = matched.reduce((s, o) => s + parseFloat(o.totalPriceSet?.shopMoney?.amount || "0"), 0);
    return { orders: matched.length, revenue };
  } catch (e) {
    return null;
  }
}