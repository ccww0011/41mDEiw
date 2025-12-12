"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {TransactionProvider} from "@/context/TransactionContext";
import {PriceProvider} from "@/context/PriceContext";
import {FxProvider} from "@/context/FxContext";
import {AggregateProvider} from "@/context/AggregateContext";

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
      <PriceProvider>
        <FxProvider>
          <AggregateProvider>
            {children}
          </AggregateProvider>
        </FxProvider>
      </PriceProvider>
    </TransactionProvider>
  );
}
