import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CreditCard, X, AlertCircle, CheckCircle } from 'lucide-react'
import api from '../services/api'

const PaymentModalContext = createContext(null)

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

export const PaymentModalProvider = ({ children }) => {
  const [modal, setModal] = useState(null)
  const [step, setStep] = useState('prompt') // prompt | processing | success | error
  const [errorMsg, setErrorMsg] = useState('')

  const showPaymentModal = useCallback((data) => {
    setModal(data)
    setStep('prompt')
    setErrorMsg('')
  }, [])

  const closeModal = useCallback(() => {
    setModal(null)
    setStep('prompt')
    setErrorMsg('')
  }, [])

  // Listen for 402 events dispatched by Axios interceptor
  useEffect(() => {
    const handler = (e) => showPaymentModal(e.detail)
    window.addEventListener('meterflow:payment-required', handler)
    return () => window.removeEventListener('meterflow:payment-required', handler)
  }, [showPaymentModal])

  const handlePay = async () => {
    setStep('processing')
    setErrorMsg('')

    try {
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) throw new Error('Failed to load Razorpay checkout')

      const { data: orderData } = await api.post('/payments/create-order', {
        billingId: modal.billingId,
      })

      const { orderId, amount, currency, keyId } = orderData.data

      const options = {
        key: keyId,
        amount,
        currency,
        name: 'MeterFlow',
        description: `API Usage Bill — ${modal.month}`,
        order_id: orderId,
        handler: async (response) => {
          try {
            await api.post('/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            setStep('success')
          } catch {
            setStep('error')
            setErrorMsg('Payment verification failed. Contact support.')
          }
        },
        theme: { color: '#6171f3' },
        modal: { ondismiss: () => setStep('prompt') },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.on('payment.failed', (response) => {
        setStep('error')
        setErrorMsg(response.error.description)
      })
      razorpay.open()
    } catch (err) {
      setStep('error')
      setErrorMsg(err.response?.data?.message || err.message)
    }
  }

  return (
    <PaymentModalContext.Provider value={{ showPaymentModal, closeModal }}>
      {children}

      {modal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface-700 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center">
                  <AlertCircle size={18} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-white">Free Tier Exhausted</h2>
                  <p className="text-xs text-slate-400">Payment required to continue</p>
                </div>
              </div>
              {step !== 'processing' && (
                <button onClick={closeModal} className="text-slate-500 hover:text-slate-300 transition-colors">
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="p-5">
              {step === 'prompt' && (
                <>
                  <div className="bg-surface-800 rounded-xl p-4 mb-5 border border-white/5">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Usage this month</span>
                      <span className="text-red-400 font-semibold">
                        {modal.totalRequests} / {modal.freeRequests} free
                      </span>
                    </div>
                    <div className="h-2 bg-surface-600 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full w-full" />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {modal.totalRequests - modal.freeRequests} requests beyond free tier
                    </p>
                  </div>

                  <div className="space-y-2 mb-5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Free tier ({modal.freeRequests} requests)</span>
                      <span className="text-emerald-400">₹0.00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Extra requests × ₹0.50/100</span>
                      <span className="text-white">₹{modal.amount?.toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-white/5 my-2" />
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-white">Total Due</span>
                      <span className="text-2xl font-display font-bold text-brand-400">
                        ₹{modal.amount?.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handlePay}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base"
                  >
                    <CreditCard size={18} />
                    Pay ₹{modal.amount?.toFixed(2)} with Razorpay
                  </button>
                  <p className="text-xs text-slate-600 text-center mt-2">
                    UPI · Cards · Net Banking · Wallets
                  </p>
                </>
              )}

              {step === 'processing' && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-300 font-medium">Opening Razorpay...</p>
                  <p className="text-slate-500 text-sm mt-1">Complete the payment in the checkout window</p>
                </div>
              )}

              {step === 'success' && (
                <div className="text-center py-8">
                  <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={28} className="text-emerald-400" />
                  </div>
                  <p className="text-white font-display font-bold text-lg mb-1">Payment Successful!</p>
                  <p className="text-slate-400 text-sm mb-6">
                    Your bill for {modal.month} has been paid. API access is restored.
                  </p>
                  <button onClick={closeModal} className="btn-primary px-8">
                    Continue using APIs
                  </button>
                </div>
              )}

              {step === 'error' && (
                <div className="text-center py-6">
                  <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={28} className="text-red-400" />
                  </div>
                  <p className="text-white font-display font-bold text-lg mb-1">Payment Failed</p>
                  <p className="text-slate-400 text-sm mb-5">{errorMsg}</p>
                  <div className="flex gap-3">
                    <button onClick={() => setStep('prompt')} className="btn-primary flex-1">Try Again</button>
                    <button onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PaymentModalContext.Provider>
  )
}

export const usePaymentModal = () => {
  const ctx = useContext(PaymentModalContext)
  if (!ctx) throw new Error('usePaymentModal must be used within PaymentModalProvider')
  return ctx
}
