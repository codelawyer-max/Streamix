import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import AxiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";

interface Plan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  downloadLimit: number;
  watchLimitMinutes: number | null;
  adFree: boolean;
  features: string[];
}

interface PaymentRecord {
  _id: string;
  plan: string;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  paidAt: string;
  invoiceNumber?: string;
  emailSent?: boolean;
}

interface SubscriptionStatus {
  plan: string;
  daysLeft: number | null;
  endDate: string | null;
  transactions: PaymentRecord[];
  user?: any;
}

const PLAN_RANK: Record<string, number> = {
  free: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
};

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
const RUPEE = "\u20B9";

// Load Razorpay's checkout script once, only when it is needed
const loadRazorpay = () =>
  new Promise<boolean>((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const formatDate = (date?: string | null) => {
  if (!date) return "";

  try {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const Subscription = () => {
  const { user, setUser } = useUser();

  const userId = user?._id;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  const isTestMode = (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").startsWith(
    "rzp_test_"
  );

  // Keep the logged-in user (context + localStorage) in step with the server
  const syncUser = (updatedUser: any) => {
    if (!updatedUser) return;

    setUser(updatedUser);

    try {
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch {
      // storage unavailable: the context copy is enough for this session
    }
  };

  const refreshStatus = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await AxiosInstance.get(`/subscription/status/${userId}`);
      setStatus(response.data);

      // The server may have downgraded an expired plan
      if (response.data.user && response.data.user.plan !== user?.plan) {
        syncUser(response.data.user);
      }
    } catch (error) {
      console.error("Subscription status error:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    const loadPlans = async () => {
      try {
        const response = await AxiosInstance.get("/subscription/plans");

        if (!cancelled) setPlans(response.data.plans || []);
      } catch (error) {
        console.error("Plans error:", error);

        if (!cancelled) setLoadError("Unable to load the plans. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPlans();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const currentPlan = status?.plan || user?.plan || "free";

  const handleSubscription = async (planId: string) => {
    if (!userId) {
      toast.error("Please log in to upgrade your plan.");
      return;
    }

    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    if (!key) {
      toast.error("Payments are not configured yet.");
      return;
    }

    setBusyPlan(planId);

    try {
      const ready = await loadRazorpay();

      if (!ready || !window.Razorpay) {
        throw new Error(
          "Could not load the payment window. Check your internet connection."
        );
      }

      // The server decides the price. We only say which plan we want.
      const orderResponse = await AxiosInstance.post(
        "/subscription/create-order",
        { plan: planId, userId }
      );

      const order = orderResponse.data.order;

      const razorpay = new window.Razorpay({
        key,
        amount: order.amount,
        currency: order.currency,
        name: "Streamix",
        description: `${planId} plan - 30 days`,
        order_id: order.id,

        handler: async (response: any) => {
          try {
            const verifyResponse = await AxiosInstance.post(
              "/subscription/verify-payment",
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }
            );

            syncUser(verifyResponse.data.user);

            toast.success(
              verifyResponse.data.alreadyProcessed
                ? "This payment was already processed."
                : "Payment successful! Your plan is active. A confirmation email with your invoice is on its way."
            );

            await refreshStatus();
          } catch (error: any) {
            toast.error(
              error?.response?.data?.message ||
                `Your payment went through but we could not confirm it. Please contact support with payment ID ${response.razorpay_payment_id}.`
            );
          } finally {
            setBusyPlan(null);
          }
        },

        prefill: {
          name: user?.name,
          email: user?.email,
        },

        theme: {
          color: "#2563eb",
        },

        modal: {
          ondismiss: () => {
            setBusyPlan(null);
          },
        },
      });

      razorpay.on("payment.failed", (failure: any) => {
        toast.error(
          failure?.error?.description || "Payment failed. Please try again."
        );
        setBusyPlan(null);
      });

      razorpay.open();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong. Please try again."
      );
      setBusyPlan(null);
    }
  };

  const buttonLabel = (planId: string) => {
    if (busyPlan === planId) return "Opening payment...";

    const difference = PLAN_RANK[planId] - (PLAN_RANK[currentPlan] ?? 0);

    if (difference === 0) return "Renew plan";
    if (difference > 0) return "Upgrade";
    return "Switch plan";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <h1 className="text-center text-3xl font-bold">Choose Your Plan</h1>
        <p className="mt-6 text-center text-gray-500">Loading plans...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <h1 className="text-center text-3xl font-bold">Choose Your Plan</h1>
        <p className="mt-6 text-center text-red-500">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <h1 className="mb-2 text-center text-3xl font-bold">Choose Your Plan</h1>

      <p className="mb-6 text-center text-sm text-gray-500">
        Longer watch time, more downloads and ad-free viewing. Every paid plan
        lasts 30 days.
      </p>

      {/* Current plan */}

      {userId ? (
        <div className="mx-auto mb-8 max-w-3xl rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-sm text-gray-500">Your current plan</p>

          <p className="mt-1 text-xl font-bold capitalize">{currentPlan}</p>

          {currentPlan !== "free" && status?.endDate && (
            <p className="mt-1 text-sm text-gray-600">
              Active until {formatDate(status.endDate)}
              {status.daysLeft !== null ? ` (${status.daysLeft} days left)` : ""}
            </p>
          )}
        </div>
      ) : (
        <div className="mx-auto mb-8 max-w-3xl rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-center text-sm text-yellow-800">
          Please log in to upgrade your plan.
        </div>
      )}

      {/* Plans */}

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const isFree = plan.id === "free";

          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-xl bg-white p-6 shadow ${
                isCurrent ? "ring-2 ring-blue-600" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold capitalize">{plan.name}</h2>

                {isCurrent && (
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                    Current
                  </span>
                )}
              </div>

              <p className="my-4 text-3xl font-bold">
                {isFree ? "Free" : `${RUPEE}${plan.price}`}

                {!isFree && (
                  <span className="text-sm font-normal text-gray-500">
                    {" "}
                    / month
                  </span>
                )}
              </p>

              <ul className="mb-6 flex-1 space-y-2 text-sm text-gray-700">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {isFree ? (
                <div className="rounded-lg bg-gray-100 px-6 py-2 text-center text-sm text-gray-500">
                  {isCurrent ? "Your plan" : "Included for everyone"}
                </div>
              ) : (
                <button
                  onClick={() => handleSubscription(plan.id)}
                  disabled={busyPlan !== null}
                  className="rounded-lg bg-blue-600 px-6 py-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {buttonLabel(plan.id)}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {isTestMode && (
        <p className="mx-auto mt-6 max-w-3xl text-center text-xs text-gray-500">
          Test mode: pay with card 4111 1111 1111 1111, any future expiry date
          and any CVV, or use the UPI ID success@razorpay. No real money is
          charged.
        </p>
      )}

      {/* Payment history */}

      {status && status.transactions.length > 0 && (
        <div className="mx-auto mt-10 max-w-6xl">
          <h2 className="mb-3 text-xl font-bold">Payment history</h2>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Payment ID</th>
                </tr>
              </thead>

              <tbody>
                {status.transactions.map((item) => (
                  <tr key={item._id} className="border-t border-gray-100">
                    <td className="px-4 py-3">{formatDate(item.paidAt)}</td>
                    <td className="px-4 py-3 capitalize">{item.plan}</td>
                    <td className="px-4 py-3">
                      {RUPEE}
                      {item.amount}
                    </td>
                    <td className="px-4 py-3">{item.invoiceNumber || "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {item.razorpayPaymentId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscription;