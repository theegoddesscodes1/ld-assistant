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
  // expires_in is in seconds (currently ~86399, i.e. just under 24h).
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

export async function getSalesSummary() {
  if (!shopifyConfigured()) return { configured: false, summary: null };

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const query = `{
    orders(first: 250, query: "created_at:>='${since.toISOString()}'") {
      edges {
        node {
          id
          createdAt
          totalPriceSet { shopMoney { amount } }
          lineItems(first: 10) {
            edges { node { title quantity } }
          }
        }
      }
    }
  }`;

  const data = await shopifyGraphQL(query);
  const orders = (data?.orders?.edges || []).map((e) => e.node);

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  let revenueLast7Days = 0;
  let ordersLast7Days = 0;
  let revenuePrevious7Days = 0;
  let revenueLast30Days = 0;
  let ordersLast30Days = 0;
  const productCounts = {};

  for (const order of orders) {
    const createdAt = new Date(order.createdAt).getTime();
    const amount = parseFloat(order.totalPriceSet?.shopMoney?.amount || "0");

    if (createdAt >= thirtyDaysAgo) {
      revenueLast30Days += amount;
      ordersLast30Days += 1;
    }
    if (createdAt >= sevenDaysAgo) {
      revenueLast7Days += amount;
      ordersLast7Days += 1;
    } else if (createdAt >= fourteenDaysAgo) {
      revenuePrevious7Days += amount;
    }
    for (const { node: item } of order.lineItems?.edges || []) {
      productCounts[item.title] = (productCounts[item.title] || 0) + item.quantity;
    }
  }

  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title, quantity]) => ({ title, quantity }));

  return {
    configured: true,
    summary: {
      revenueLast7Days,
      ordersLast7Days,
      revenuePrevious7Days,
      avgOrderValue7d: ordersLast7Days ? revenueLast7Days / ordersLast7Days : 0,
      revenueLast30Days,
      ordersLast30Days,
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
