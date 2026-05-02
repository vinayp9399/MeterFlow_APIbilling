import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { CreditCard, FileText, CheckCircle, TrendingUp, Receipt, AlertCircle, ExternalLink } from 'lucide-react'

// Dynamically load Razorpay checkout script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function BillingPage() {
  const queryClient = useQueryClient()
  const [paymentError, setPaymentError] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)

  const { data: current, isLoading } = useQuery({
    queryKey: ['current-billing'],
    queryFn: async () => { const { data } = await api.get('/billing/current'); return data.data.billing },
  })

  const { data: history } = useQuery({
    queryKey: ['billing-history'],
    queryFn: async () => { const { data } = await api.get('/billing/history'); return data.data.billings },
  })

  const { data: pricing } = useQuery({
    queryKey: ['pricing'],
    queryFn: async () => { const { data } = await api.get('/billing/pricing'); return data.data.pricing },
  })

  const { data: paymentHistory } = useQuery({
    queryKey: ['payment-history'],
    queryFn: async () => { const { data } = await api.get('/payments/history'); return data.data.payments },
  })

  const { data: razorpayConfig } = useQuery({
    queryKey: ['razorpay-config'],
    queryFn: async () => { const { data } = await api.get('/payments/config'); return data.data },
  })

  const handlePayment = async () => {
    setPaymentError('')
    setProcessingPayment(true)

    try {
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay. Check your internet connection.')
      }

      const { data: orderData } = await api.post('/payments/create-order', {
        billingId: current._id,
      })

      const { orderId, amount, currency, keyId } = orderData.data

      const options = {
        key: keyId,
        amount,
        currency,
        name: 'MeterFlow',
        description: `API Usage Bill — ${current.month}`,
        order_id: orderId,
        handler: async (response) => {
          try {
            await api.post('/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            setPaymentSuccess(true)
            queryClient.invalidateQueries({ queryKey: ['current-billing'] })
            queryClient.invalidateQueries({ queryKey: ['billing-history'] })
            queryClient.invalidateQueries({ queryKey: ['payment-history'] })
          } catch (err) {
            setPaymentError('Payment verification failed. Contact support with payment ID: ' + response.razorpay_payment_id)
          } finally {
            setProcessingPayment(false)
          }
        },
        prefill: { name: '', email: '' },
        theme: { color: '#6171f3' },
        modal: { ondismiss: () => setProcessingPayment(false) },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.on('payment.failed', (response) => {
        setPaymentError(`Payment failed: ${response.error.description}`)
        setProcessingPayment(false)
      })
      razorpay.open()
    } catch (err) {
      setPaymentError(err.response?.data?.message || err.message || 'Payment failed')
      setProcessingPayment(false)
    }
  }

  const freeUsagePct = current ? Math.min(100, (current.totalRequests / current.freeRequests) * 100) : 0
  
  // FIX: logic updated to check if amount exists at all
  const hasBalance = current?.amount > 0
  const isPaid = current?.status === 'paid'

  return (
    <div className="p-8 space-y-7 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Billing</h1>
        <p className="text-slate-400 text-sm mt-1">Usage-based billing — pay only for what you use</p>
      </div>

      {paymentSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3 animate-slide-up">
          <CheckCircle size={20} className="text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-emerald-400 font-semibold text-sm">Payment successful!</p>
            <p className="text-emerald-400/70 text-xs mt-0.5">Your bill for {current?.month} has been marked as paid.</p>
          </div>
        </div>
      )}

      {paymentError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-400 font-semibold text-sm">Payment Error</p>
            <p className="text-red-400/70 text-xs mt-0.5">{paymentError}</p>
          </div>
          <button onClick={() => setPaymentError('')} className="text-red-400/50 hover:text-red-400 transition-colors text-xs">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-5">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="font-display font-semibold text-white text-lg">Current Billing Period</h2>
                <p className="text-slate-400 text-sm mt-0.5">{current?.month || '—'}</p>
              </div>
              <span className={`font-medium text-sm px-3 py-1 rounded-full ${
                isPaid ? 'badge-active' :
                current?.status === 'overdue' ? 'badge-revoked' : 'badge-pending'
              }`}>
                {current?.status || 'pending'}
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-surface-600 rounded animate-pulse" />)}</div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Free tier usage</span>
                    <span className="text-slate-300">{current?.totalRequests?.toLocaleString()} / {current?.freeRequests?.toLocaleString()}</span>
                  </div>
                  <div className="h-2.5 bg-surface-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        freeUsagePct >= 100 ? 'bg-red-500' :
                        freeUsagePct >= 80  ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${freeUsagePct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">
                    {freeUsagePct >= 100
                      ? '⚠ Free tier exhausted — additional usage is billed'
                      : `${(100 - freeUsagePct).toFixed(0)}% free quota remaining`
                    }
                  </p>
                </div>

                <div className="space-y-0 divide-y divide-white/5">
                  {[
                    { label: 'Total requests',      value: current?.totalRequests?.toLocaleString(),  color: 'text-slate-200' },
                    { label: 'Free tier included',  value: `-${current?.freeRequests?.toLocaleString()}`, color: 'text-emerald-400' },
                    { label: 'Billable requests',   value: current?.billableRequests?.toLocaleString(), color: 'text-slate-200' }
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between text-sm py-3">
                      <span className="text-slate-400">{label}</span>
                      <span className={color}>{value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 mt-2 border-t border-white/10">
                  <span className="font-semibold text-white">Amount Due</span>
                  <span className="text-3xl font-display font-bold text-brand-400">
                    ₹{current?.amount|| '0.00'}
                  </span>
                </div>

                {/* UPDATED CONDITIONAL BLOCK */}
                <div className="mt-5">
                  {isPaid ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 rounded-xl px-4 py-3 border border-emerald-500/20">
                      <CheckCircle size={16} />
                      <span>This bill has been paid</span>
                    </div>
                  ) : !hasBalance ? (
                    <div className="flex items-center gap-2 text-brand-400 text-sm bg-brand-500/10 rounded-xl px-4 py-3 border border-brand-500/20">
                      <CheckCircle size={16} />
                      <span>You're within the free tier — nothing to pay this month!</span>
                    </div>
                  ) : !razorpayConfig?.configured ? (
                    <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 rounded-xl px-4 py-3 border border-amber-500/20">
                      <AlertCircle size={16} />
                      <span>Razorpay not configured. Check your environment variables.</span>
                    </div>
                  ) : (
                    <button
                      onClick={handlePayment}
                      disabled={processingPayment}
                      className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
                    >
                      {processingPayment ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Opening checkout...
                        </>
                      ) : (
                        <>
                          <CreditCard size={18} />
                          Pay ₹{current?.amount} with Razorpay
                        </>
                      )}
                    </button>
                  )}
                </div>

                {hasBalance && !isPaid && razorpayConfig?.configured && (
                  <p className="text-xs text-slate-600 text-center mt-2">
                    Secured by Razorpay · UPI, Cards, Net Banking, Wallets accepted
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-brand-400" /> Pricing
            </h3>
            <div className="space-y-3">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                <p className="font-semibold text-emerald-400 text-sm mb-0.5">Free Tier</p>
                <p className="text-2xl font-display font-bold text-white">₹0</p>
                <p className="text-xs text-slate-400 mt-1">{pricing?.free?.requests?.toLocaleString()} requests/month</p>
              </div>
              <div className="bg-brand-500/5 border border-brand-500/20 rounded-xl p-4">
                <p className="font-semibold text-brand-400 text-sm mb-0.5">Beyond Free Tier</p>
                <p className="text-2xl font-display font-bold text-white">₹{pricing?.pro?.pricePerHundred}</p>
                <p className="text-xs text-slate-400 mt-1">per 100 requests</p>
              </div>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <CreditCard size={16} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-200">Powered by Razorpay</p>
              <p className="text-[10px] text-slate-500 mt-0.5">UPI · Cards · Net Banking · Wallets</p>
            </div>
          </div>
        </div>
      </div>

      {paymentHistory?.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
            <Receipt size={16} /> Payment History
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="pb-3 text-xs text-slate-500 font-medium">Month</th>
                  <th className="pb-3 text-xs text-slate-500 font-medium">Amount</th>
                  <th className="pb-3 text-xs text-slate-500 font-medium">Status</th>
                  <th className="pb-3 text-xs text-slate-500 font-medium">Transaction ID</th>
                  <th className="pb-3 text-xs text-slate-500 font-medium">Paid At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paymentHistory.map(p => (
                  <tr key={p._id} className="hover:bg-white/2 transition-colors">
                    <td className="py-3 font-medium text-slate-200">{p.month}</td>
                    <td className="py-3 text-white font-semibold">₹{p.amountInRupees?.toFixed(2)}</td>
                    <td className="py-3">
                      <span className={p.status === 'paid' ? 'badge-active' : p.status === 'failed' ? 'badge-revoked' : 'badge-pending'}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-xs text-slate-500">
                      {p.razorpayPaymentId || p.razorpayOrderId?.slice(0, 20) + '…'}
                    </td>
                    <td className="py-3 text-slate-500 text-xs">
                      {p.paidAt ? new Date(p.paidAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card p-5">
        <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
          <FileText size={16} /> Billing History
        </h2>
        {history?.length === 0 ? (
          <p className="text-center text-slate-500 py-8 text-sm">No billing history yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="pb-3 text-xs text-slate-500 font-medium">Month</th>
                  <th className="pb-3 text-xs text-slate-500 font-medium">Requests</th>
                  <th className="pb-3 text-xs text-slate-500 font-medium">Billable</th>
                  <th className="pb-3 text-xs text-slate-500 font-medium">Amount</th>
                  <th className="pb-3 text-xs text-slate-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history?.map(b => (
                  <tr key={b._id} className="hover:bg-white/2 transition-colors">
                    <td className="py-3 font-medium text-slate-200">{b.month}</td>
                    <td className="py-3 text-slate-400">{b.totalRequests?.toLocaleString()}</td>
                    <td className="py-3 text-slate-400">{b.billableRequests?.toLocaleString()}</td>
                    <td className="py-3 font-semibold text-white">₹{b.amount?.toFixed(2)}</td>
                    <td className="py-3">
                      <span className={b.status === 'paid' ? 'badge-active' : b.status === 'overdue' ? 'badge-revoked' : 'badge-pending'}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}