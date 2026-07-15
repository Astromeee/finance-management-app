import '@supabase/functions-js/edge-runtime.d.ts'
import { withSupabase } from '@supabase/server'

const RECENT_AUTH_WINDOW_SECONDS = 10 * 60

export default {
  fetch: withSupabase({ auth: 'user' }, async (_request, context) => {
    const userId = context.userClaims?.sub
    if (!userId) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }

    const { data: authData, error: userError } = await context.supabaseAdmin.auth.admin.getUserById(userId)
    const lastSignIn = authData.user?.last_sign_in_at ? Date.parse(authData.user.last_sign_in_at) : Number.NaN
    const sessionAge = (Date.now() - lastSignIn) / 1000
    if (userError || !Number.isFinite(sessionAge) || sessionAge > RECENT_AUTH_WINDOW_SECONDS) {
      return Response.json(
        { error: 'For your security, sign out and sign back in before deleting your account.' },
        { status: 403 },
      )
    }

    const { error: financeError } = await context.supabaseAdmin.rpc('delete_my_finance_data', { p_user: userId })
    if (financeError) {
      console.error('delete-account: finance deletion failed', {
        code: financeError.code,
        message: financeError.message,
      })
      return Response.json({ error: 'Your account could not be deleted. No Auth user was removed.' }, { status: 500 })
    }

    const { error: authError } = await context.supabaseAdmin.auth.admin.deleteUser(userId)
    if (authError) {
      console.error('delete-account: auth deletion failed', {
        message: authError.message,
        userId,
      })
      return Response.json(
        { error: 'Your ledger was deleted, but the sign-in account still needs support assistance.' },
        { status: 500 },
      )
    }

    return Response.json({ deleted: true })
  }),
}
