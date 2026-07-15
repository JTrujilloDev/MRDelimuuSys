import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import logo from "/LogoTexto.png";
import numeral from "numeral";
import { QrCode } from "lucide-react";
interface OrderSummaryItem {
  name: string;
  quantity: number;
  price: number;
}

const index = () => {
  //   const socket = useSocket();

  const socket = io("http://100.88.114.91:3000");

  const [accountInfo, setAccountInfo] = useState(null);
  const [displayState, setDisplayState] = useState("idle");

  useEffect(() => {
    socket.on("account-updated", (account) => {
      setAccountInfo(account);
      setDisplayState(account ? "summary" : "idle");
      console.log("Cuenta recibida:", account);
    });

    socket.on("show-qr", () => {
      setDisplayState("qr");
    });

    return () => {
      socket.off("account-updated");
    };
  }, [socket]);

  console.log("Display state:", displayState);

  return (
    <div className=" w-screen h-screen  bg-orange-50 flex flex-col">
      {/* Display area */}
      <div className="flex-1 flex items-center justify-center p-8">
        {displayState === "idle" && <IdleView />}
        
        {displayState === "summary" && (
          <SummaryView
            items={accountInfo?.accountItems || []}
            discount={accountInfo?.discount || 0}
            total={accountInfo?.total}
          />
        )}
        {displayState === "qr" && <QrView total={accountInfo?.total} />}
      </div>
    </div>
  );
};

/* ---------- Idle: logo ---------- */
const IdleView = () => (
  <div className="flex flex-col items-center gap-6 animate-fade-in w-full h-full">
    <div className=" rounded-3xl  flex items-center justify-center w-3/5">
      <img src={logo} alt="Logo" className="h-full w-full" />
    </div>
    <div className="text-center">
      <p className="text-3xl font-bold text-black mt-2">¡Bienvenido!</p>
    </div>
  </div>
);

/* ---------- Summary ---------- */
const SummaryView = ({
  items,
  discount,
  total,
}: {
  items: OrderSummaryItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}) => (
  <div className="flex flex-col items-center gap-6 animate-fade-in">
    <div className=" rounded-3xl  flex items-center justify-center w-3/5">
      <img src={logo} alt="Logo" />
    </div>
    <div className="flex h-full w-full flex-col rounded-[28px] border p-3 border-white/10 bg-pos-order-bg text-pos-order-fg shadow-[0_24px_60px_-36px_rgba(15,10,8,0.8)] align-center ">
      <h2 className="text-2xl font-bold text-orange-50 text-center mb-6 mt-5">
        Resumen de Cuenta
      </h2>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        {/* Items */}
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className=" text-orange-50">
                {item.quantity}x {item.productName}
              </span>
              <span className="font-medium text-foreground">
                {numeral(item.price * item.quantity).format("$0,0")}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-border pt-4 space-y-2">
          {discount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
              <span>Descuento</span>
              <span>-{numeral(discount).format("$0,0")}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold text-foreground pt-3 border-t border-border">
            <span>Total</span>
            <span>{numeral(total).format("$0,0")}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ---------- QR ---------- */
const QrView = ({ total }: { total: number }) => (
  <div className="flex flex-col items-center gap-6 animate-fade-in">
    <div className=" rounded-3xl  flex items-center justify-center w-3/5">
      <img src={logo} alt="Logo" />
    </div>
    <h2 className="text-2xl font-bold text-black">Escanea para pagar</h2>
    <div className="h-56 w-56 rounded-3xl bg-card border-2 border-border flex items-center justify-center">
      <QrCode className="h-28 w-28 text-black" />
    </div>
    <p className="text-3xl font-bold text-black">
      {numeral(total).format("$ 0,0")}
    </p>
    <p className="text-sm text-gray-500">
      Apunta tu cámara al código QR
    </p>
  </div>
);

export default index;
