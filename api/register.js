const LOYVERSE_BASE = 'https://api.loyverse.com/v1.0';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(body));
}

function normalizeMauritiusPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('230')) digits = digits.slice(3);
  // Mauritius mobile numbers are generally 8 digits; keep validation deliberately simple.
  if (!/^\d{8}$/.test(digits)) return null;
  return `+230${digits}`;
}

function normalizeStoredPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('230') && digits.length === 11) return `+${digits}`;
  if (digits.length === 8) return `+230${digits}`;
  return String(value || '').replace(/\s/g,'');
}

async function loyverseFetch(path, options = {}) {
  const token = process.env.LOYVERSE_ACCESS_TOKEN;
  if (!token) throw new Error('Server is missing LOYVERSE_ACCESS_TOKEN.');

  const response = await fetch(`${LOYVERSE_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }

  if (!response.ok) {
    const detail = body?.errors?.[0]?.detail || body?.message || `Loyverse API returned ${response.status}.`;
    throw new Error(detail);
  }
  return body;
}

async function findCustomerByPhone(phone) {
  let cursor = null;
  let pages = 0;
  const maxPages = 40; // safety ceiling: up to 10,000 customers at 250/page

  while (pages < maxPages) {
    const qs = new URLSearchParams({ limit: '250' });
    if (cursor) qs.set('cursor', cursor);

    const body = await loyverseFetch(`/customers?${qs.toString()}`);
    const customers = Array.isArray(body.customers) ? body.customers : [];

    const found = customers.find(c => normalizeStoredPhone(c.phone_number) === phone && !c.deleted_at);
    if (found) return found;

    cursor = body.cursor || null;
    if (!cursor || customers.length === 0) break;
    pages++;
  }
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const name = String(body.name || '').trim().slice(0, 64);
    const email = String(body.email || '').trim().slice(0, 100);
    const birthday = String(body.birthday || '').trim().slice(0, 10);
    const outlet = String(body.outlet || 'unspecified').replace(/[^\w .-]/g,'').slice(0, 40);
    const consent = body.consent === true;
    const phone = normalizeMauritiusPhone(body.phone);

    if (!name) return json(res, 400, { error: 'Please enter your full name.' });
    if (!phone) return json(res, 400, { error: 'Please enter a valid 8-digit Mauritius mobile number.' });
    if (!consent) return json(res, 400, { error: 'Please accept the membership consent to join.' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(res, 400, { error: 'Please enter a valid email address or leave it blank.' });
    }

    const existing = await findCustomerByPhone(phone);
    if (existing) {
      return json(res, 200, { ok: true, existing: true, customer_id: existing.id });
    }

    const joined = new Date().toISOString().slice(0, 10);
    const noteParts = [
      'Mr Juice Club',
      `Joined ${joined}`,
      `Outlet: ${outlet || 'unspecified'}`,
      birthday ? `Birthday: ${birthday}` : null,
      'Marketing consent: yes'
    ].filter(Boolean);

    const customerPayload = {
      name,
      phone_number: phone,
      country_code: 'MU',
      note: noteParts.join(' | ').slice(0,255),
      total_points: 0
    };
    if (email) customerPayload.email = email;

    const created = await loyverseFetch('/customers', {
      method: 'POST',
      body: JSON.stringify(customerPayload)
    });

    return json(res, 200, { ok: true, existing: false, customer_id: created.id });
  } catch (err) {
    console.error('Registration error:', err);
    return json(res, 500, {
      error: 'We could not activate the membership right now. Please ask a Mr Juice team member for help.'
    });
  }
};
