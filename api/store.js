// API da Rotina da Casa — guarda os dados no Redis (Upstash) da Vercel.
// GET  /api/store            -> todas as coleções { pets: {id: doc}, tasks: {...}, ... }
// POST /api/store {ops:[...]} -> aplica escritas: {op:'set'|'update'|'delete', c, id, data}
// Toda chamada precisa do cabeçalho x-pin igual à variável de ambiente APP_PIN.

const crypto = require('crypto');

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const PIN = process.env.APP_PIN || '';
const PREFIX = 'rc:';
const COLLS = ['pets', 'tasks', 'compras', 'historico', 'dias', 'memoria'];
const ID_RE = /^[A-Za-z0-9_\-.~:@+]{1,200}$/;

async function redis(cmds) {
  const r = await fetch(REDIS_URL.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + REDIS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error('Redis respondeu ' + r.status);
  const out = await r.json();
  return out.map((x) => {
    if (x.error) throw new Error(x.error);
    return x.result;
  });
}

function pinOk(given) {
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(PIN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
function merge(base, patch) {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = isObj(v) && isObj(out[k]) ? merge(out[k], v) : v;
  }
  return out;
}

async function readAll() {
  const res = await redis(COLLS.map((c) => ['HGETALL', PREFIX + c]));
  const data = {};
  COLLS.forEach((c, i) => {
    const flat = res[i] || [];
    const m = {};
    for (let j = 0; j < flat.length; j += 2) {
      try { m[flat[j]] = JSON.parse(flat[j + 1]); } catch (_) {}
    }
    data[c] = m;
  });
  return data;
}

// Na primeira vez, importa os dados que já existiam no Claude (api/_seed.json).
async function seedIfNeeded() {
  const [seeded] = await redis([['GET', PREFIX + 'seeded']]);
  if (seeded) return;
  let seed = {};
  try { seed = require('./_seed.json'); } catch (_) {}
  const cmds = [];
  for (const c of COLLS) {
    for (const [id, doc] of Object.entries(seed[c] || {})) {
      cmds.push(['HSETNX', PREFIX + c, id, JSON.stringify(doc)]);
    }
  }
  cmds.push(['SET', PREFIX + 'seeded', new Date().toISOString()]);
  await redis(cmds);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Banco de dados não configurado. Conecte o Upstash Redis ao projeto na Vercel.' });
  }
  if (!PIN) {
    return res.status(500).json({ error: 'Defina a variável APP_PIN no projeto da Vercel.' });
  }
  if (!pinOk(req.headers['x-pin'])) {
    return res.status(401).json({ error: 'PIN incorreto.' });
  }

  try {
    if (req.method === 'GET') {
      await seedIfNeeded();
      return res.status(200).json(await readAll());
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const ops = Array.isArray(body.ops) ? body.ops.slice(0, 100) : [];
      for (const op of ops) {
        if (!COLLS.includes(op.c) || !ID_RE.test(String(op.id || ''))) {
          return res.status(400).json({ error: 'Caminho inválido.' });
        }
        if (op.op !== 'delete' && !isObj(op.data)) {
          return res.status(400).json({ error: 'Dados inválidos.' });
        }
      }
      for (const op of ops) {
        const key = PREFIX + op.c;
        if (op.op === 'delete') {
          await redis([['HDEL', key, op.id]]);
        } else if (op.op === 'set') {
          await redis([['HSET', key, op.id, JSON.stringify(op.data)]]);
        } else if (op.op === 'update') {
          const [cur] = await redis([['HGET', key, op.id]]);
          const base = cur ? JSON.parse(cur) : {};
          await redis([['HSET', key, op.id, JSON.stringify(merge(base, op.data))]]);
        } else {
          return res.status(400).json({ error: 'Operação inválida.' });
        }
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (e) {
    return res.status(502).json({ error: 'Falha ao acessar o banco: ' + e.message });
  }
};
