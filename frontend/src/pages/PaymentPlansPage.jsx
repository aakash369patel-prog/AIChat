import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load Razorpay checkout.'))
    document.body.appendChild(script)
  })
}

export default function PaymentPlansPage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [plans, setPlans] = useState([])
  const [markupPercent, setMarkupPercent] = useState(20)
  const [razorpayEnabled, setRazorpayEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/billing/plans')
      .then((res) => {
        setPlans(res.data.plans)
        setMarkupPercent(res.data.markup_percent ?? 20)
        setRazorpayEnabled(Boolean(res.data.razorpay_enabled))
      })
      .catch(() => setError('Could not load plans.'))
      .finally(() => setLoading(false))
  }, [])

  const handleDemoSubscribe = async (planId) => {
    setError('')
    setSubscribing(planId)
    try {
      await api.post('/billing/subscribe', { plan_id: planId })
      await refreshUser()
      navigate('/', { replace: true, state: { subscribed: true } })
    } catch (err) {
      setError(err.response?.data?.message || 'Subscription failed. Try again.')
    } finally {
      setSubscribing(null)
    }
  }

  const handleRazorpayCheckout = async (plan) => {
    setError('')
    setSubscribing(plan.id)
    try {
      await loadRazorpayScript()
      const orderRes = await api.post('/billing/razorpay/order', { plan_id: plan.id })
      const checkout = orderRes.data.checkout

      const rzp = new window.Razorpay({
        key: checkout.key_id,
        amount: checkout.amount,
        currency: checkout.currency,
        name: 'AI Chat Board',
        description: `${checkout.plan_name} plan`,
        order_id: checkout.order_id,
        handler: async (response) => {
          try {
            await api.post('/billing/razorpay/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            await refreshUser()
            navigate('/', { replace: true, state: { subscribed: true } })
          } catch (err) {
            setError(err.response?.data?.message || 'Payment verification failed.')
          } finally {
            setSubscribing(null)
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: { color: '#059669' },
      })

      rzp.on('payment.failed', () => {
        setError('Payment was cancelled or failed.')
        setSubscribing(null)
      })

      rzp.open()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Checkout failed.')
      setSubscribing(null)
    }
  }

  const handleSelect = (plan) => {
    if (razorpayEnabled) {
      handleRazorpayCheckout(plan)
    } else {
      handleDemoSubscribe(plan.id)
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-400">Paid access</p>
            <h1 className="mt-1 text-3xl font-semibold text-white">Choose your plan</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Pick the tier that fits how you chat. All prices are in Indian Rupees (INR) and
              include a {markupPercent}% platform fee on the base amount.
            </p>
          </div>
          <Link
            to="/"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            ← Back to chat
          </Link>
        </div>

        {user?.is_subscribed && (
          <div className="mb-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            You are on plan:{' '}
            <strong>
              {plans.find((p) => p.id === user.subscribed_plan)?.name ?? user.subscribed_plan}
            </strong>
            .
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-center text-slate-400">Loading plans...</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                markupPercent={markupPercent}
                disabled={Boolean(user?.is_subscribed)}
                loading={subscribing === plan.id}
                razorpayEnabled={razorpayEnabled}
                onSelect={() => handleSelect(plan)}
              />
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-500">
          {razorpayEnabled
            ? 'Secure checkout powered by Razorpay. Demo subscribe is disabled while keys are configured.'
            : 'Demo checkout: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend .env for live payments.'}
        </p>
      </div>
    </div>
  )
}

function formatInr(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function PlanCard({ plan, markupPercent, disabled, loading, razorpayEnabled, onSelect }) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
      <h2 className="text-lg font-semibold text-white">{plan.name}</h2>
      <p className="mt-2 flex-1 text-sm text-slate-400">{plan.description}</p>
      <p className="mt-4 text-xs text-slate-500">{plan.prompts_included}</p>

      <div className="mt-6 border-t border-slate-800 pt-4">
        <p className="text-xs text-slate-500">
          Base {formatInr(plan.base_price_inr)} + {markupPercent}% fee (
          {formatInr(plan.markup_amount_inr)})
        </p>
        <p className="mt-1 text-3xl font-bold text-white">
          {formatInr(plan.price_inr)}
          <span className="text-sm font-normal text-slate-500"> / {plan.billing_period}</span>
        </p>
      </div>

      <button
        type="button"
        disabled={disabled || loading}
        onClick={onSelect}
        className="mt-6 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? razorpayEnabled
            ? 'Opening checkout…'
            : 'Activating…'
          : disabled
            ? 'Current plan active'
            : razorpayEnabled
              ? 'Pay with Razorpay'
              : 'Subscribe (demo)'}
      </button>
    </div>
  )
}