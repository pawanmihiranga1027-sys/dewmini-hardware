import { useState } from "react";
import { Link, useParams } from "wouter";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowRight, LogIn, QrCode, ShieldCheck } from "lucide-react";

export default function StaffInvite() {
  const { token = "" } = useParams<{ token: string }>();
  const { user, loading, isAuthenticated } = useAuth();
  const [redeemed, setRedeemed] = useState(false);
  const redeem = trpc.admin.staff.redeemInvite.useMutation({ onSuccess: (result) => { setRedeemed(true); toast.success(`${result.role === "admin" ? "Admin" : result.role === "manager" ? "Manager" : "Order Staff"} access activated`); setTimeout(() => { window.location.href = "/admin"; }, 700); }, onError: (error) => toast.error(error.message) });

  return <div className="invite-page"><div className="invite-panel"><div className="invite-big-icon"><QrCode size={30} /></div><div className="kicker">DEWMINI HARDWARE</div><h1>You’ve been invited to the staff team.</h1><p>This secure invite lets you use your own account to access the Dewmini control room. Your password is never shared with the shop owner.</p>{loading ? <div className="invite-status">Checking your login...</div> : redeemed ? <div className="invite-status success"><ShieldCheck size={18} /> Access activated. Opening control room...</div> : isAuthenticated ? <div className="invite-action"><div className="signed-in-note"><ShieldCheck size={16} /><span>Signed in as <b>{user?.email || user?.name || "your account"}</b></span></div><Button className="primary-btn full-btn" disabled={redeem.isPending} onClick={() => redeem.mutate({ token })}><ShieldCheck size={17} /> {redeem.isPending ? "Activating access..." : "Accept staff invite"}</Button><small>This one-time invite expires after 30 minutes and can be used once.</small></div> : <div className="invite-action"><Button className="primary-btn full-btn" onClick={() => startLogin()}><LogIn size={17} /> Login with your own account</Button><small>After login, return to this invite page and accept access.</small></div>}<Link href="/" className="back-home"><ArrowRight size={15} /> Back to Dewmini shop</Link></div></div>;
}
