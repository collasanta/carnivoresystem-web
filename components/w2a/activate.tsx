"use client";

import { Activation } from "./success";
import { Page, Title, TopBar } from "./ui";

export function Activate({ code }: { code: string }) {
  if (!/^[A-Za-z0-9-]{8,20}$/.test(code))
    return (
      <Page>
        <TopBar />
        <Title sub="Abra o link do e-mail de novo ou escreva para leo@leodiet.com.">Código não encontrado</Title>
      </Page>
    );
  return <Activation code={code} />;
}
