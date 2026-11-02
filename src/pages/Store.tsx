import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  UserCheck,
  Crown,
  MessageSquare,
  ShieldCheck,
  CreditCard,
  Building,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Flame,
  Zap,
  Check,
  ExternalLink,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getPaymentSettings,
  createEngagementOrder,
  getEngagementOrders,
  DEFAULT_PAYMENT_SETTINGS
} from '../services/supabaseService';
import { PaymentSettings, StoreProductType, EngagementOrder } from '../types';

interface StorePageProps {
  onNavigateHome?: () => void;
  onOpenProfile?: (userId: string) => void;
}

export const StorePage: React.FC<StorePageProps> = ({ onNavigateHome }) => {
  const { user, profile, openAuthModal } = useAuth();

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [currency, setCurrency] = useState<'USD' | 'NGN'>('NGN');
  const [selectedProduct, setSelectedProduct] = useState<StoreProductType | null>(null);

  // Checkout modal state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'bank_transfer'>('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<EngagementOrder | null>(null);
  const [checkoutError, setCheckoutError] = useState('');

  // User order history
  const [myOrders, setMyOrders] = useState<EngagementOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    getPaymentSettings().then(setPaymentSettings);
    if (user) {
      loadMyOrders();
    }
  }, [user]);

  const loadMyOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const all = await getEngagementOrders();
      const filtered = all.filter((o) => o.userId === user.uid);
      setMyOrders(filtered);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOrders(false);
    }
  };

  const products = [
    {
      id: 'account_promotion' as StoreProductType,
      title: 'Account Promotion',
      tagline: 'Supercharge Profile Discovery',
      description:
        'Pushes your creator profile into active For You & Trending recommendation pools. Distributed to real, active audiences interested in your genre.',
      icon: <UserCheck className="w-6 h-6 text-[#8A2BE2]" />,
      priceUsd: paymentSettings.accountPromoPriceUsd,
      priceNgn: paymentSettings.accountPromoPriceNgn,
      highlights: [
        'Real audience distribution guaranteed',
        'Top placement in suggested creators',
        'Profile spotlight banner for 7 days',
        'Zero fake bots or synthetic accounts'
      ],
      popular: false
    },
    {
      id: 'post_promotion' as StoreProductType,
      title: 'Post Engagement Boost',
      tagline: 'Viral Stream Acceleration',
      description:
        'Pushes your selected video post to high-engagement stream feeds. Generates authentic viewer interactions from real users across Africa & globally.',
      icon: <Flame className="w-6 h-6 text-[#FF1744]" />,
      priceUsd: paymentSettings.postPromoPriceUsd,
      priceNgn: paymentSettings.postPromoPriceNgn,
      highlights: [
        'Guaranteed algorithmic reach boost',
        'High-retention feed placement',
        'Targeted category viewers',
        'Real comments and bookmark spikes'
      ],
      popular: true
    },
    {
      id: 'comment_promotion' as StoreProductType,
      title: 'Comment Spotlight',
      tagline: 'Pinned Creator Discussion',
      description:
        'Spotlights your comment at the very top of trending videos and challenges. Drives high-intent traffic directly to your page.',
      icon: <MessageSquare className="w-6 h-6 text-emerald-400" />,
      priceUsd: paymentSettings.commentPromoPriceUsd,
      priceNgn: paymentSettings.commentPromoPriceNgn,
      highlights: [
        'Pinned at #1 on top 5 trending posts',
        'Golden badge halo effect',
        'Direct profile tap-throughs',
        'Active for 14 continuous days'
      ],
      popular: false
    },
    {
      id: 'monthly_premium' as StoreProductType,
      title: 'ARAO Premium VIP (Monthly)',
      tagline: 'Ad-Free + 2x Creator Coins',
      description:
        '100% ad-free viewing, 2x Creator Coins earnings, HD 4K video uploads, VIP Star Badge, and exclusive glowing story borders.',
      icon: <Crown className="w-6 h-6 text-amber-400" />,
      priceUsd: paymentSettings.monthlyPremiumPriceUsd,
      priceNgn: paymentSettings.monthlyPremiumPriceNgn,
      highlights: [
        '100% Ad-Free Video Streaming',
        '2x Creator Coins Earnings Boost',
        'Ultra HD 4K Video Quality',
        'Golden VIP Badge on Profile'
      ],
      popular: false
    },
    {
      id: 'yearly_premium' as StoreProductType,
      title: 'ARAO Premium VIP (Yearly)',
      tagline: 'Best Value • 12 Months Access',
      description:
        'Full 365 days of ARAO VIP membership with server-verified expiration date. Includes all VIP perks plus early access to new studio features.',
      icon: <Sparkles className="w-6 h-6 text-[#8A2BE2]" />,
      priceUsd: paymentSettings.yearlyPremiumPriceUsd,
      priceNgn: paymentSettings.yearlyPremiumPriceNgn,
      highlights: [
        'All Monthly VIP perks for 1 full year',
        'Save over 35% compared to monthly',
        'Permanent VIP Star badge',
        'Priority customer care & review'
      ],
      popular: true
    }
  ];

  const handleOpenCheckout = (product: StoreProductType) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    setSelectedProduct(product);
    setCheckoutError('');
    setOrderSuccess(null);
    setPaymentReference('');
    setProofFile(null);
    setTargetUrl(product === 'account_promotion' ? `@${profile?.username || ''}` : '');
    setCheckoutOpen(true);
  };

  const handleProcessOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !selectedProduct) return;

    if (!paymentReference.trim()) {
      setCheckoutError('Please enter your transaction ID or payment reference number.');
      return;
    }

    const prod = products.find((p) => p.id === selectedProduct);
    if (!prod) return;

    setSubmittingOrder(true);
    setCheckoutError('');

    try {
      const order = await createEngagementOrder({
        userId: user.uid,
        customerEmail: user.email || profile.email,
        productType: selectedProduct,
        productTitle: prod.title,
        targetUrl: targetUrl.trim() || undefined,
        amountUsd: prod.priceUsd,
        amountNaira: prod.priceNgn,
        paymentMethod,
        paymentReference: paymentReference.trim(),
        proofFile: proofFile || undefined
      });

      setOrderSuccess(order);
      loadMyOrders();
    } catch (err: any) {
      console.error('Order creation error:', err);
      setCheckoutError(err.message || 'Failed to submit order. Please check connection.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#080810] text-white pb-28 pt-4 px-4 max-w-4xl mx-auto font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6 border-b border-purple-500/15 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateHome}
            className="p-2 rounded-full bg-[#12121C] border border-white/10 hover:border-[#8A2BE2] text-gray-300 hover:text-white transition-all cursor-pointer"
            title="Back to Feed"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                ARAO <span className="text-[#8A2BE2]">Store</span>
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#8A2BE2]/20 border border-[#8A2BE2]/40 text-[#D8B4FE]">
                Official Promotion Hub
              </span>
            </div>
            <p className="text-xs text-[#A5A5B5] mt-0.5">
              Genuine audience distribution, viral reach, and creator VIP memberships
            </p>
          </div>
        </div>

        {/* Currency Switcher */}
        <div className="flex rounded-xl bg-[#12121C] p-1 border border-white/10 text-xs font-bold">
          <button
            onClick={() => setCurrency('NGN')}
            className={`px-3 py-1 rounded-lg transition-all ${
              currency === 'NGN' ? 'bg-[#8A2BE2] text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            ₦ NGN
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className={`px-3 py-1 rounded-lg transition-all ${
              currency === 'USD' ? 'bg-[#8A2BE2] text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            $ USD
          </button>
        </div>
      </div>

      {/* Real Audience Guarantee Banner (Anti-Bot Policy) */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-950/70 via-[#171626] to-purple-900/40 border border-purple-500/30 flex items-start gap-3.5 shadow-lg">
        <div className="p-2.5 rounded-xl bg-[#8A2BE2]/25 text-[#D8B4FE] shrink-0 border border-purple-500/30">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Real Audience Distribution Guarantee</span>
            <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
              100% Genuine
            </span>
          </h2>
          <p className="text-xs text-gray-300 mt-1 leading-relaxed">
            ARAO enforces strict algorithmic organic distribution. We never create fake followers, bots, fake likes, or artificial comments. Every promotional campaign is distributed directly across real viewers and creators on the ARAO network.
          </p>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {products.map((prod) => {
          const priceDisplay =
            currency === 'NGN' ? `₦${prod.priceNgn.toLocaleString()}` : `$${prod.priceUsd}`;

          return (
            <div
              key={prod.id}
              className={`relative rounded-3xl p-5 bg-[#0F0E17] border transition-all duration-300 flex flex-col justify-between hover:scale-[1.01] ${
                prod.popular
                  ? 'border-[#8A2BE2] shadow-[0_0_30px_rgba(138,43,226,0.25)] ring-1 ring-[#8A2BE2]/40'
                  : 'border-purple-500/20 hover:border-purple-500/40 shadow-md'
              }`}
            >
              {prod.popular && (
                <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#7000FF] to-[#8A2BE2] text-[10px] font-bold text-white shadow-md uppercase tracking-wider">
                  Most Popular
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-2xl bg-[#12121C] border border-white/10">{prod.icon}</div>
                  <div className="text-right">
                    <span className="text-xl sm:text-2xl font-black text-white">{priceDisplay}</span>
                    <span className="text-[10px] text-gray-400 block">one-time / cycle</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white">{prod.title}</h3>
                <p className="text-[11px] text-purple-300 font-medium mb-2">{prod.tagline}</p>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">{prod.description}</p>

                <div className="space-y-1.5 mb-5 border-t border-white/5 pt-3">
                  {prod.highlights.map((h, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleOpenCheckout(prod.id)}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  prod.popular
                    ? 'bg-gradient-to-r from-[#7000FF] via-[#8A2BE2] to-[#FF1744] text-white shadow-[0_0_20px_rgba(138,43,226,0.4)] hover:opacity-95'
                    : 'bg-[#1A1926] hover:bg-[#8A2BE2]/30 text-white border border-purple-500/30'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Promote Now ({priceDisplay})</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* User Order History Section */}
      {user && (
        <div className="rounded-3xl bg-[#0F0E17] border border-purple-500/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#8A2BE2]" />
              <span>Your Store Orders & Campaigns</span>
            </h2>
            <span className="text-xs text-gray-400 font-mono">{myOrders.length} total</span>
          </div>

          {loadingOrders ? (
            <div className="py-6 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#8A2BE2]" />
            </div>
          ) : myOrders.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">No promotional orders placed yet.</p>
          ) : (
            <div className="space-y-2.5">
              {myOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-3 rounded-2xl bg-[#12121C] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{ord.productTitle}</span>
                      <span className="text-[10px] font-mono text-gray-400">({ord.orderId})</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      Ref: <span className="font-mono text-purple-300">{ord.paymentReference}</span> • Method:{' '}
                      <span className="capitalize">{ord.paymentMethod.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span className="text-xs font-bold font-mono text-white">
                      ${ord.amountUsd} / ₦{ord.amountNaira.toLocaleString()}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        ord.status === 'completed'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                          : ord.status === 'rejected'
                          ? 'bg-red-950/80 text-red-400 border border-red-500/30'
                          : 'bg-amber-950/80 text-amber-400 border border-amber-500/30 animate-pulse'
                      }`}
                    >
                      {ord.status === 'completed' ? 'Active / Completed' : ord.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {checkoutOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#0F0E17] border border-purple-500/30 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(138,43,226,0.35)] text-white my-auto max-h-[94vh] flex flex-col">
            <button
              onClick={() => setCheckoutOpen(false)}
              disabled={submittingOrder}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {orderSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">Order Received!</h3>
                <p className="text-xs text-purple-300 font-mono">Order ID: {orderSuccess.orderId}</p>
                <p className="text-xs text-gray-300 max-w-sm mx-auto leading-relaxed">
                  Your payment reference has been recorded. Our administrators will verify the transaction and activate your campaign or VIP subscription.
                </p>
                <button
                  onClick={() => setCheckoutOpen(false)}
                  className="mt-4 py-2 px-6 rounded-xl bg-[#8A2BE2] text-white font-bold text-xs"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleProcessOrder} className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#7000FF] to-[#8A2BE2] flex items-center justify-center text-white">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {products.find((p) => p.id === selectedProduct)?.title}
                    </h3>
                    <p className="text-xs text-purple-300 font-bold font-mono">
                      Total: ${products.find((p) => p.id === selectedProduct)?.priceUsd} / ₦
                      {products.find((p) => p.id === selectedProduct)?.priceNgn.toLocaleString()}
                    </p>
                  </div>
                </div>

                {checkoutError && (
                  <div className="p-3 bg-red-950/70 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{checkoutError}</span>
                  </div>
                )}

                {/* Target Link or Username (if promotion) */}
                {selectedProduct !== 'monthly_premium' && selectedProduct !== 'yearly_premium' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                      Target ARAO Username or Video URL <span className="text-purple-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      placeholder="@username or https://arao.app?video=..."
                      className="w-full py-2 px-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8A2BE2]"
                      required
                    />
                  </div>
                )}

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1.5">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bank_transfer')}
                      className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                        paymentMethod === 'bank_transfer'
                          ? 'bg-[#8A2BE2]/20 border-[#8A2BE2] text-white shadow-md'
                          : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      <Building className="w-4 h-4 text-emerald-400" />
                      <span>Bank Transfer (NGN)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('paypal')}
                      className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                        paymentMethod === 'paypal'
                          ? 'bg-[#8A2BE2]/20 border-[#8A2BE2] text-white shadow-md'
                          : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-cyan-400" />
                      <span>PayPal (USD)</span>
                    </button>
                  </div>
                </div>

                {/* Bank / PayPal Details Box */}
                <div className="p-3.5 rounded-2xl bg-[#12121C] border border-purple-500/20 text-xs space-y-2">
                  <div className="flex items-center justify-between text-gray-400 text-[11px]">
                    <span className="font-semibold text-white">Payment Destination</span>
                    <span className="text-purple-300">Secure Direct Deposit</span>
                  </div>

                  {paymentMethod === 'bank_transfer' ? (
                    <div className="space-y-1 font-mono text-[11px]">
                      <div>
                        Bank: <strong className="text-white">{paymentSettings.bankName}</strong>
                      </div>
                      <div>
                        Account Number:{' '}
                        <strong className="text-amber-400 text-sm select-all">
                          {paymentSettings.accountNumber}
                        </strong>
                      </div>
                      <div>
                        Account Name: <strong className="text-white">{paymentSettings.accountName}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 font-mono text-[11px]">
                      <div>
                        PayPal Recipient:{' '}
                        <strong className="text-cyan-400 text-sm select-all">
                          {paymentSettings.paypalEmail}
                        </strong>
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-gray-400 pt-1 border-t border-white/5">
                    {paymentSettings.instructions}
                  </p>
                </div>

                {/* Payment Reference */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Transaction Reference / Session ID <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. 0902674829103 or PayPal transaction ID"
                    className="w-full py-2 px-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8A2BE2]"
                    required
                  />
                </div>

                {/* Upload Receipt Proof */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Payment Receipt Proof (Screenshot/PDF)
                  </label>
                  <div
                    onClick={() => document.getElementById('payment_proof_input')?.click()}
                    className="w-full py-3 px-3 rounded-2xl border border-dashed border-purple-500/30 hover:border-[#8A2BE2] bg-black/40 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Upload className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-gray-300">
                      {proofFile ? proofFile.name : 'Upload Payment Screenshot'}
                    </span>
                    <input
                      id="payment_proof_input"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7000FF] via-[#8A2BE2] to-[#FF1744] hover:opacity-95 text-white font-bold text-xs shadow-[0_0_20px_rgba(138,43,226,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  {submittingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Order to Verification Vault...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm & Submit Order</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
