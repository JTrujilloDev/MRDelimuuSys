import { useEffect, useState } from "react";
import { useParams } from "react-router";
import logo from "/LogoTexto.png";
import numeral from "numeral";
import { QrCode, ReceiptText, ShoppingBag } from "lucide-react";
import { useSocket } from "../../../shared/socket/useSocket";

interface OrderSummaryItem {
  id: number;
  productName: string;
  quantity: number;
  price: number;
}

interface ClientAccount {
  id: number;
  name: string;
  terminalId: number;
  accountItems: OrderSummaryItem[];
  discount: number;
  total: number;
}

type DisplayState = "idle" | "summary" | "qr";

const ClientView = () => {
  const { terminalId: terminalIdParam } = useParams();
  const terminalId = Number(terminalIdParam);
  const socket = useSocket();
  const [accountInfo, setAccountInfo] = useState<ClientAccount | null>(null);
  const [displayState, setDisplayState] = useState<DisplayState>("idle");
  const [qrTotal, setQrTotal] = useState(0);

  useEffect(() => {
    if (!Number.isInteger(terminalId)) return;

    const joinDisplay = () => socket.emit("client-display:join", { terminalId });
    const handleAccountUpdated = (account: ClientAccount | null) => {
      setAccountInfo(account);
      setDisplayState(account ? "summary" : "idle");
      if (!account) setQrTotal(0);
    };
    const handleQr = ({ total }: { total: number }) => {
      setQrTotal(total);
      setDisplayState("qr");
    };

    socket.on("account-updated", handleAccountUpdated);
    socket.on("show-qr", handleQr);
    socket.on("connect", joinDisplay);
    joinDisplay();

    return () => {
      socket.off("account-updated", handleAccountUpdated);
      socket.off("show-qr", handleQr);
      socket.off("connect", joinDisplay);
    };
  }, [socket, terminalId]);

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-[#fff8ed] text-[#2f211b]">
      {displayState === "idle" && <IdleView />}
      {displayState === "summary" && accountInfo && <SummaryView account={accountInfo} />}
      {displayState === "qr" && <QrView total={qrTotal || accountInfo?.total || 0} />}
    </main>
  );
};

const Brand = ({ compact = false }: { compact?: boolean }) => (
  <img
    src={logo}
    alt="Delimuu"
    className={compact ? "h-20 w-64 object-contain object-left" : "w-full max-w-lg object-contain"}
  />
);

const IdleView = () => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-7 p-10 text-center">
    <Brand />
    <div>
      <p className="text-4xl font-black tracking-tight">¡Bienvenido!</p>
      <p className="mt-2 text-xl text-[#72594c]">Tu pedido aparecerá aquí</p>
    </div>
  </div>
);

const SummaryView = ({ account }: { account: ClientAccount }) => (
  <div className="grid h-full w-full grid-rows-[auto_minmax(0,1fr)_auto] gap-4 p-6 lg:p-8">
    <header className="flex items-center justify-between gap-6">
      <Brand compact />
      <div className="text-right">
        <h1 className="text-3xl font-black">Tu pedido</h1>
      </div>
    </header>

    <section className="min-h-0 overflow-hidden rounded-[28px] bg-[#30231e] text-white shadow-xl">
      <div className="flex items-center gap-3 border-b border-white/10 px-7 py-4">
        <ReceiptText className="h-6 w-6 text-[#f0a35b]" />
        <h2 className="text-xl font-black">Resumen del pedido</h2>
        <span className="ml-auto rounded-full bg-white/10 px-3 py-1.5 text-base font-bold">
          {account.accountItems.reduce((sum, item) => sum + item.quantity, 0)} productos
        </span>
      </div>
      <div className="h-[calc(100%_-_66px)] overflow-y-auto px-7 py-2">
        {account.accountItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-white/55">
            <ShoppingBag className="mb-3 h-12 w-12" />
            <p className="text-xl">Agregando productos…</p>
          </div>
        ) : account.accountItems.map((item) => (
          <div key={item.id} className="flex items-center gap-4 border-b border-white/10 py-4 last:border-none">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f0a35b] text-xl font-black text-[#30231e]">{item.quantity}</span>
            <p className="min-w-0 flex-1 text-xl font-bold leading-tight">{item.productName}</p>
            <p className="shrink-0 text-xl font-black">{numeral(item.price * item.quantity).format("$ 0,0")}</p>
          </div>
        ))}
      </div>
    </section>

    <footer className="rounded-[24px] border border-[#ead7c4] bg-white px-7 py-4 shadow-md">
      {account.discount > 0 && <div className="mb-2 flex justify-between text-xl font-semibold text-emerald-700"><span>Descuento</span><span>-{numeral(account.discount).format("$ 0,0")}</span></div>}
      <div className="flex items-baseline justify-between"><span className="text-2xl font-black">Total</span><span className="text-4xl font-black text-[#c76f2d]">{numeral(account.total).format("$ 0,0")}</span></div>
    </footer>
  </div>
);

const QrView = ({ total }: { total: number }) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-7 p-10 text-center">
    <Brand compact />
    <div><h2 className="text-3xl font-black">Escanea para pagar</h2><p className="mt-2 text-lg text-[#72594c]">Apunta la cámara al código QR</p></div>
    <div className="flex h-60 w-60 items-center justify-center rounded-[30px] border-4 border-[#30231e] bg-white shadow-lg"><QrCode className="h-36 w-36 text-[#30231e]" /></div>
    <p className="text-4xl font-black text-[#c76f2d]">{numeral(total).format("$ 0,0")}</p>
  </div>
);

export default ClientView;
