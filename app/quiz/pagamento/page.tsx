import { Suspense } from "react";
import { MockCheckout } from "@/components/w2a/mock-checkout";

export default function PaymentPage() {
  return (
    <Suspense>
      <MockCheckout />
    </Suspense>
  );
}
