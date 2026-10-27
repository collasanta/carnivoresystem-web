import { Suspense } from "react";
import { GatewayCheckout } from "@/components/w2a/checkout";
import { MockCheckout } from "@/components/w2a/mock-checkout";

/** /quiz/pagamento — ?m=pix|card: real gateway (Pix QR / card in a new tab); no m: the mock gateway (local dev). */
export default async function PaymentPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  return <Suspense>{m === "pix" || m === "card" ? <GatewayCheckout /> : <MockCheckout />}</Suspense>;
}
