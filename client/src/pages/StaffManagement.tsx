import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { canManageStaffAccess } from "@/pages/Admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { ArrowLeft, Check, Copy, MailPlus, QrCode, ShieldCheck, Trash2, UserCog, UsersRound } from "lucide-react";

const roleInfo = {
  admin: { label: "Admin", description: "Full catalog, orders and staff access" },
  manager: { label: "Manager", description: "Add/edit products and view orders" },
  order_staff: { label: "Order Staff", description: "View incoming orders only" },
};

type StaffRole = keyof typeof roleInfo;

export default function StaffManagement() {
  const { user, loading, isAuthenticated } = useAuth();
  const isOwner = Boolean(user?.isOwner);
  const canManageStaff = canManageStaffAccess(user?.staffRole ?? null, isOwner, user?.role);
  const staffQuery = trpc.admin.staff.list.useQuery(undefined, { enabled: canManageStaff });
  const utils = trpc.useUtils();
  const grant = trpc.admin.staff.grant.useMutation({ onSuccess: () => { toast.success("Staff access එක add කළා"); void utils.admin.staff.list.invalidate(); setEmail(""); } });
  const createInvite = trpc.admin.staff.createInvite.useMutation({ onSuccess: ({ token }) => { const url = `${window.location.origin}/staff/invite/${token}`; setInviteUrl(url); toast.success("Secure QR invite එක create කළා"); } });
  const setStatus = trpc.admin.staff.setStatus.useMutation({ onSuccess: () => { toast.success("Access status එක update කළා"); void utils.admin.staff.list.invalidate(); } });
  const remove = trpc.admin.staff.remove.useMutation({ onSuccess: () => { toast.success("Staff access එක remove කළා"); void utils.admin.staff.list.invalidate(); } });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("order_staff");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  if (loading) return <div className="admin-loading"><div className="loader-orbit" /><p>Owner access checking...</p></div>;
  if (!isAuthenticated || !canManageStaff) return <div className="admin-gate"><div className="gate-card"><div className="gate-icon"><ShieldCheck size={28} /></div><div className="kicker">FULL ADMIN AREA</div><h1>Full Admin access only.</h1><p>Staff accounts add/remove කරන්න Full Admin හෝ owner access එක අවශ්‍යයි.</p><Link href="/admin" className="back-home"><ArrowLeft size={15} /> Back to control room</Link></div></div>;
  const safeUser = user as NonNullable<typeof user>;

  const submit = (event: React.FormEvent) => { event.preventDefault(); grant.mutate({ email: email.trim(), role }); };
  const copyInvite = async () => { if (!inviteUrl) return; await navigator.clipboard.writeText(inviteUrl); toast.success("Invite link එක copy කළා"); };

  return <div className="admin-shell"><aside className="admin-sidebar"><Link href="/" className="admin-brand"><img src="/manus-storage/dewmini-logo_0804a5e7.webp" alt="Dewmini" /><span><b>DEWMINI</b><small>CONTROL ROOM</small></span></Link><div className="admin-side-nav"><Link href="/admin" className="side-link"><ArrowLeft size={18} /> Back to dashboard</Link><div className="side-link active"><UsersRound size={18} /> Staff access</div></div><div className="side-note"><ShieldCheck size={16} /><p><b>Full Admin protected</b><br />Full Admins can change staff permissions.</p></div></aside><main className="admin-main staff-main"><header className="admin-topbar"><div><div className="kicker">FULL ADMIN SETTINGS</div><h1>Staff access</h1><p className="panel-helper">Add people you trust. Full Admins can assign any staff role.</p></div><div className="avatar">{(safeUser.name || "O").slice(0, 1).toUpperCase()}</div></header><section className="staff-layout"><div className="staff-invite-stack"><form className="staff-invite-card" onSubmit={submit}><div className="invite-icon"><MailPlus size={22} /></div><div className="kicker">ADD A TEAM MEMBER</div><h2>Give someone access.</h2><p>Staff memberගේ own Manus account email එක add කරන්න. ඔවුන් login වූ විට access active වෙයි.</p><label><span>Staff email address</span><Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="staff@example.com" /></label><div className="role-picker"><span>Choose permission</span>{(Object.keys(roleInfo) as StaffRole[]).map((key) => <label key={key} className={role === key ? "role-choice selected" : "role-choice"}><input type="radio" checked={role === key} onChange={() => setRole(key)} /><span><b>{roleInfo[key].label}</b><small>{roleInfo[key].description}</small></span>{role === key && <Check size={16} />}</label>)}</div><Button className="primary-btn full-btn" disabled={grant.isPending}><MailPlus size={17} /> {grant.isPending ? "Adding access..." : "Add staff access"}</Button></form><section className="qr-invite-card"><div className="invite-icon qr-icon"><QrCode size={22} /></div><div className="kicker">QUICK INVITE</div><h2>Share access by QR.</h2><p>QR scan කරන කෙනා තමන්ගේ Manus account එකෙන් login වුණාම selected role එකට access ලැබෙනවා.</p><Button className="qr-button" disabled={createInvite.isPending} onClick={() => createInvite.mutate({ role })}><QrCode size={17} /> {createInvite.isPending ? "Creating secure QR..." : `Create ${roleInfo[role].label} QR`}</Button>{inviteUrl && <div className="invite-result"><div className="invite-qr-box"><QRCodeSVG value={inviteUrl} size={150} level="H" includeMargin /></div><div><b>{roleInfo[role].label} invite ready</b><small>Expires in 30 minutes · one scan only</small><button className="copy-invite" onClick={copyInvite}><Copy size={14} /> Copy invite link</button></div></div>}<div className="qr-safety"><ShieldCheck size={15} /><span>This QR does not contain your password. It is a one-time, expiring invite.</span></div></section></div><section className="staff-list-card"><div className="manager-head"><div><div className="kicker">YOUR TEAM</div><h2>Approved staff</h2></div><span className="team-count">{staffQuery.data?.length ?? 0} people</span></div><div className="staff-list">{staffQuery.data?.map((member) => <div className="staff-row" key={member.id}><div className="staff-avatar"><UserCog size={18} /></div><div className="staff-identity"><b>{member.email}</b><small>{roleInfo[member.role].label} · {member.isActive ? "Active" : "Paused"}</small></div><div className="staff-role-chip">{roleInfo[member.role].label}</div><button className={`access-toggle ${member.isActive ? "on" : ""}`} title={member.isActive ? "Pause access" : "Activate access"} onClick={() => setStatus.mutate({ id: member.id, isActive: !member.isActive })}><span /></button><button className="icon-button danger" title="Remove staff access" onClick={() => remove.mutate({ id: member.id })}><Trash2 size={16} /></button></div>)}{!staffQuery.data?.length && <div className="admin-empty"><UsersRound size={28} /><p>No staff added yet. Add your first team member.</p></div>}</div><div className="staff-safety-note"><ShieldCheck size={16} /><p><b>Safe by default.</b> Adding an email does not share your owner account. Staff members use their own login, and you can pause or remove access any time.</p></div></section></section></main></div>;
}
