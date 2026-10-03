import { FormEvent, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, Clock3, PackageCheck, Search, ShieldCheck, Truck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const money = (value: number) => `රු ${new Intl.NumberFormat("en-LK").format(value)}`;
const steps = ["pending", "confirmed", "completed"] as const;
const statusLabel: Record<string, string> = { pending: "Order received", confirmed: "Confirmed by Dewmini", completed: "Delivered / completed", cancelled: "Cancelled" };

export default function MyOrders() {
  const [orderNo, setOrderNo] = useState("");
  const [phone, setPhone] = useState("");
  const [lookupInput, setLookupInput] = useState<{ orderNo: string; phone: string } | null>(null);
  const lookup = trpc.orders.lookup.useQuery(lookupInput ?? { orderNo: "DW-0000-000000", phone: "000000000" }, { enabled: Boolean(lookupInput), retry: false });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!/^DW-\d{4}-\d{6}$/i.test(orderNo.trim())) return toast.error("Order number එක DW-2026-123456 වගේ ඇතුළත් කරන්න");
    if (phone.trim().replace(/\D/g, "").length < 9) return toast.error("Order එකේදී භාවිතා කළ phone number එක ඇතුළත් කරන්න");
    setLookupInput({ orderNo: orderNo.trim().toUpperCase(), phone: phone.trim() });
  };
  const data = lookup.data;
  const currentIndex = data ? steps.indexOf(data.order.status as typeof steps[number]) : -1;

  return <div className="tracking-page"><header className="tracking-header"><Link href="/" className="brand"><img src="/manus-storage/dewmini-logo_0804a5e7.webp" alt="Dewmini Hardware" width="42" height="42" /><span><b>DEWMINI</b><small>HARDWARE</small></span></Link><Link href="/" className="back-category"><ArrowLeft size={14} /> Back to store</Link></header><main className="tracking-shell"><div className="tracking-hero"><div className="legal-kicker"><PackageCheck size={16} /> Customer order tracking</div><h1>My Orders</h1><p>Order number සහ checkout එකේදී භාවිතා කළ phone number එක දීලා order status එක බලන්න.</p></div><form className="tracking-form" onSubmit={submit}><label><span>Order number</span><Input value={orderNo} onChange={(event) => setOrderNo(event.target.value)} placeholder="DW-2026-123456" autoComplete="off" /></label><label><span>Phone number</span><Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="077 831 9024" autoComplete="tel" /></label><Button className="primary-btn" disabled={lookup.isFetching}><Search size={16} /> {lookup.isFetching ? "Checking..." : "Track order"}</Button></form>{lookup.error && <div className="tracking-error"><XCircle size={18} /><div><b>Order එක හමු වුණේ නැහැ</b><small>Order number සහ phone number එක හරියට match වෙනවාද බලන්න.</small></div></div>}{data && <section className="tracking-result"><div className="tracking-result-head"><div><span className="eyebrow">ORDER {data.order.orderNo}</span><h2>{statusLabel[data.order.status] || data.order.status}</h2><small>Placed {new Date(data.order.createdAt).toLocaleString("en-LK")}</small></div><span className={`tracking-status-pill ${data.order.status}`}>{data.order.status}</span></div>{data.order.status !== "cancelled" ? <div className="status-timeline">{steps.map((step, index) => <div key={step} className={index <= currentIndex ? "timeline-step active" : "timeline-step"}><span>{index <= currentIndex ? <Check size={15} /> : <Clock3 size={15} />}</span><b>{statusLabel[step]}</b>{index < steps.length - 1 && <i />}</div>)}</div> : <div className="cancelled-state"><XCircle size={22} /> This order was cancelled. Please contact Dewmini Hardware for help.</div>}<div className="tracking-detail-grid"><div><h3>Customer details</h3><p><b>{data.order.customerName}</b><br />{data.order.phone}<br />{data.order.area}<br />{data.order.address}</p></div><div><h3>Order items</h3>{data.items.map((item) => <p className="tracking-item" key={item.id}><span>{item.productName} × {item.quantity}</span><b>{money(item.lineTotalLkr)}</b></p>)}<p className="tracking-total"><span>Total</span><b>{money(data.order.totalLkr)}</b></p></div></div><div className="tracking-security"><ShieldCheck size={15} /> Details are shown only after matching the order number and phone number.</div></section>}</main></div>;
}
