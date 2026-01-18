"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {TransactionProvider} from "@/context/TransactionContext";
import {PriceProvider} from "@/context/PriceContext";
import {FxProvider} from "@/context/FxContext";
import {ValuationProvider} from "@/context/ValuationContext";
import {DividendProvider} from "@/context/DividendContext";


export default function ProtectedLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="container" style={{ justifyContent: "center", alignItems: "center" }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ justifyContent: "center", alignItems: "center" }}>
        <h2>Redirecting to home...</h2>
      </div>
    );
  }

  return (
    <TransactionProvider>
      <DividendProvider>
        <PriceProvider>
          <FxProvider>
            <ValuationProvider>
              {children}
            </ValuationProvider>
          </FxProvider>
        </PriceProvider>
      </DividendProvider>
    </TransactionProvider>
  );
}
