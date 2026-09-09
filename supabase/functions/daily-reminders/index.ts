import { createClient } from 'npm:@supabase/supabase-js@2.108.0'
import webpush from 'npm:web-push@3.6.7'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!['GET','POST'].includes(request.method)) return reply({ error: 'Method not allowed' }, 405)
  try {
    const { data: initialConfig, error } = await db.rpc('reminder_server_config')
    let config = initialConfig
    if (error) throw error
    if (!config.publicKey) {
      const keys = webpush.generateVAPIDKeys()
      const initialized = await db.rpc('initialize_reminder_keys', { p_public: keys.publicKey, p_private: keys.privateKey })
      if (initialized.error) throw initialized.error
      config = initialized.data
    }
    if (request.method === 'GET') return reply({ publicKey: config.publicKey })
    if (!config.cronSecret || request.headers.get('x-cron-secret') !== config.cronSecret) return reply({ error: 'Unauthorized' }, 401)
    webpush.setVapidDetails('https://pocket-ledger-seven-phi.vercel.app', config.publicKey, config.privateKey)
    const claimed = await db.rpc('claim_daily_reminders')
    if (claimed.error) throw claimed.error
    let sent = 0, failed = 0
    for (const subscription of claimed.data ?? []) {
      // Subscription URLs are untrusted user input. Only browser push services may be contacted.
      const url = new URL(subscription.endpoint)
      const allowed = url.protocol === 'https:' && !url.port && !url.username && !url.password && (
        url.hostname === 'fcm.googleapis.com' || url.hostname === 'updates.push.services.mozilla.com' ||
        url.hostname.endsWith('.push.apple.com') || url.hostname === 'web.push.apple.com' ||
        url.hostname.endsWith('.notify.windows.com'))
      if (!allowed) { failed++; continue }
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ body: 'Anything to record today? A little check-in keeps your ledger up to date.' }), { TTL: 1800, timeout: 10000 })
        sent++
      } catch (error) {
        failed++
        const status = (error as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
        // Keep the delivery claim on uncertain failures to avoid duplicate daily prompts.
      }
    }
    return reply({ sent, failed })
  } catch {
    console.error('Daily reminder service failed')
    return reply({ error: 'Reminder service unavailable' }, 503)
  }
})
