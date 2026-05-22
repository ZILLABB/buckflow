"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Scissors,
  Layers,
  ArrowRight,
  ArrowLeft,
  Store,
  Utensils,
  Sparkles,
  Stethoscope,
  Truck,
  Briefcase,
  Shirt,
  Cpu,
  Apple,
  MoreHorizontal,
  Check,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

const businessTypes = [
  {
    value: "product",
    label: "Product / Sales",
    description: "I sell physical or digital products (e-commerce, retail, food, etc.)",
    icon: ShoppingBag,
    color: "emerald",
  },
  {
    value: "service",
    label: "Service / Bookings",
    description: "I provide services that customers book (salon, clinic, consulting, etc.)",
    icon: Scissors,
    color: "blue",
  },
  {
    value: "hybrid",
    label: "Both (Hybrid)",
    description: "I sell products AND provide bookable services",
    icon: Layers,
    color: "purple",
  },
];

const categories = [
  { value: "retail", label: "Retail / General Store", icon: Store },
  { value: "restaurant", label: "Restaurant / Food", icon: Utensils },
  { value: "salon", label: "Salon / Beauty", icon: Sparkles },
  { value: "spa", label: "Spa / Wellness", icon: Sparkles },
  { value: "clinic", label: "Clinic / Healthcare", icon: Stethoscope },
  { value: "logistics", label: "Logistics / Delivery", icon: Truck },
  { value: "consulting", label: "Consulting / Professional", icon: Briefcase },
  { value: "fashion", label: "Fashion / Clothing", icon: Shirt },
  { value: "electronics", label: "Electronics / Tech", icon: Cpu },
  { value: "grocery", label: "Grocery / Supermarket", icon: Apple },
  { value: "other", label: "Other", icon: MoreHorizontal },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleComplete() {
    if (!selectedType || !selectedCategory) return;
    setSaving(true);
    try {
      await api.patch("/business/me", {
        business_type: selectedType,
        category: selectedCategory,
        booking_enabled: selectedType === "service" || selectedType === "hybrid",
      });
      router.push("/conversations");
    } catch {
      // Still navigate — settings can be changed later
      router.push("/conversations");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[640px]"
      >
        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className={`h-2 w-16 rounded-full transition-colors ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
          <div className={`h-2 w-16 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight">What type of business do you run?</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  This helps us show you the right features. You can change this anytime in Settings.
                </p>
              </div>

              <div className="grid gap-4">
                {businessTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`group relative flex items-start gap-4 rounded-xl border-2 p-5 text-left transition-all ${
                      selectedType === type.value
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    }`}
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      selectedType === type.value ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      <type.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{type.label}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{type.description}</p>
                    </div>
                    {selectedType === type.value && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </motion.div>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedType}
                  className="h-11 px-6"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight">What category best describes you?</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Pick the closest match — this helps us tailor AI responses for your industry.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`group flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
                      selectedCategory === cat.value
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    }`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      selectedCategory === cat.value ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      <cat.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium">{cat.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="h-11"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={!selectedCategory || saving}
                  className="h-11 px-6"
                >
                  {saving ? "Setting up..." : "Get Started"} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skip link */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <button
            onClick={() => router.push("/conversations")}
            className="underline hover:text-foreground"
          >
            Skip for now — I'll set this up later
          </button>
        </p>
      </motion.div>
    </div>
  );
}
