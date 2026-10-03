import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRight, ChevronDown, Clock3, Hammer, MapPin, Menu, MessageCircle, Minus, PackageCheck, Plus, Search, ShoppingBag, Sparkles, Truck, X } from "lucide-react";

export type CatalogProduct = {
  id: number;
  name: string;
  nameSi: string;
  category: string;
  description: string;
  priceLkr: number;
  stockQuantity: number;
  imageUrl: string;
  galleryImages?: string | null;
  badge?: string | null;
  isFeatured: boolean;
  isActive: boolean;
};

export type CatalogCategory = {
  id?: number;
  slug: string;
  name: string;
  label: string;
  imageUrl: string;
  image?: string;
  sortOrder?: number;
  isActive?: boolean;
};

type CartLine = CatalogProduct & { quantity: number };

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=700&q=72`;

const fallbackProducts: CatalogProduct[] = [
  { id: 1, name: "Professional Claw Hammer", nameSi: "ප්‍රොෆෙෂනල් ක්ලෝ හැමර්", category: "Tools", description: "Balanced steel head with a comfortable grip for everyday repairs.", priceLkr: 2850, stockQuantity: 12, imageUrl: img("photo-1586864387967-d02ef85d93e8"), badge: "Best seller", isFeatured: true, isActive: true },
  { id: 2, name: "Cordless Drill 21V", nameSi: "කෝඩ්ලස් ඩ්‍රිල් 21V", category: "Power tools", description: "Reliable 21V drill kit with battery, charger and carry case.", priceLkr: 18900, stockQuantity: 8, imageUrl: img("photo-1504148455328-c376907d081c"), badge: "New", isFeatured: true, isActive: true },
  { id: 3, name: "Measuring Tape 5M", nameSi: "මීටර් 5 මිනුම් පටිය", category: "Tools", description: "Clear markings, lock button and impact-resistant case.", priceLkr: 1250, stockQuantity: 20, imageUrl: img("photo-1618220179428-22790b461013"), badge: "Everyday pick", isFeatured: true, isActive: true },
  { id: 4, name: "PVC Plumbing Set", nameSi: "PVC ජලනල සෙට් එක", category: "Plumbing", description: "Essential fittings for quick home plumbing fixes.", priceLkr: 3450, stockQuantity: 9, imageUrl: img("photo-1607472586893-edb57bdc0e39"), badge: null, isFeatured: false, isActive: true },
  { id: 5, name: "Exterior Wall Paint 1L", nameSi: "බාහිර බිත්ති තීන්ත 1L", category: "Paint", description: "Long-lasting colour and weather protection for your walls.", priceLkr: 4200, stockQuantity: 14, imageUrl: img("photo-1562259949-e8e7689d7828"), badge: "Fresh stock", isFeatured: false, isActive: true },
  { id: 6, name: "Heavy Duty Extension", nameSi: "හෙවි ඩියුටි එක්ස්ටෙන්ෂන්", category: "Electrical", description: "Safe 4-way extension with overload protection.", priceLkr: 2950, stockQuantity: 10, imageUrl: img("photo-1621905252507-b35492cc74b4"), badge: null, isFeatured: false, isActive: true },
];

export const catalogCategories = [
  { name: "Tools", label: "Hand tools & essentials", image: img("photo-1586864387967-d02ef85d93e8") },
  { name: "Power tools", label: "Drills, saws & more", image: img("photo-1504148455328-c376907d081c") },
  { name: "Plumbing", label: "Pipes & fittings", image: img("photo-1607472586893-edb57bdc0e39") },
  { name: "Electrical", label: "Power & lighting", image: img("photo-1621905252507-b35492cc74b4") },
  { name: "Paint", label: "Colour your project", image: img("photo-1562259949-e8e7689d7828") },
  { name: "JCB & Excavator Rental", label: "JCB loaders & excavators", image: "/manus-storage/jcb-loader_a7f808b8.jpg" },
];
export const categorySlug = (name: string) => name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const money = (value: number) => `රු ${new Intl.NumberFormat("en-LK").format(value)}`;

export function ProductCard({ product, onAdd }: { product: CatalogProduct; onAdd: (product: CatalogProduct) => void }) {
  const [, navigate] = useLocation();
  const openDetails = () => navigate(`/product/${product.id}`);
  return (
    <article className="product-card group" role="link" tabIndex={0} aria-label={`View details for ${product.nameSi}`} onClick={openDetails} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDetails(); } }}>
      <div className="product-image-wrap">
        <img src={product.imageUrl} alt={product.nameSi} className="product-image" loading="lazy" decoding="async" />
        {product.badge && <span className="product-badge">{product.badge}</span>}
        <button aria-label={`Add ${product.nameSi} to cart`} className="quick-add" disabled={product.stockQuantity <= 0} onClick={(event) => { event.stopPropagation(); onAdd(product); }}><Plus size={18} /></button>
      </div>
      <div className="product-body">
        <div className="eyebrow">{product.category}</div>
        <h3>{product.nameSi}</h3>
        <p>{product.description}</p>
        <div className="product-footer"><strong>{money(product.priceLkr)}</strong><button disabled={product.stockQuantity <= 0} onClick={(event) => { event.stopPropagation(); onAdd(product); }}>{product.stockQuantity > 0 ? <>Add to cart <ArrowRight size={15} /></> : "Out of stock"}</button></div>
      </div>
    </article>
  );
}

export default function Home() {
  const createOrder = trpc.orders.create.useMutation();
  const categoriesQuery = trpc.catalog.categories.useQuery();
  const [globalSearch, setGlobalSearch] = useState("");
  const searchInput = useMemo(() => ({ search: globalSearch.trim(), page: 1, pageSize: 24 }), [globalSearch]);
  const searchQuery = trpc.catalog.list.useQuery(searchInput, { enabled: globalSearch.trim().length > 1 });
  const categories: CatalogCategory[] = categoriesQuery.data?.length ? categoriesQuery.data : catalogCategories.map((item) => ({ ...item, slug: categorySlug(item.name), imageUrl: item.image }));
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "details">("cart");
  const [form, setForm] = useState({ customerName: "", phone: "", area: "", address: "", requestedDate: "", deliveryTime: "", specialNote: "", fulfilment: "delivery" as "delivery" | "pickup", paymentMethod: "cod" as "cod" | "bank" | "shop", privacyConsent: false, website: "" });
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dewmini-cart");
      if (saved) setCart(JSON.parse(saved) as CartLine[]);
      if (window.location.search.includes("cart=1")) setCartOpen(true);
    } catch { /* Ignore invalid local cart data. */ }
  }, []);
  useEffect(() => { localStorage.setItem("dewmini-cart", JSON.stringify(cart)); }, [cart]);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.12 });
    elements.forEach((element) => observer.observe(element));
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      document.documentElement.style.setProperty("--scroll-progress", `${max > 0 ? (window.scrollY / max) * 100 : 0}%`);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.priceLkr * item.quantity, 0);

  const addToCart = (product: CatalogProduct) => {
    if (product.stockQuantity <= 0) return toast.error("මේ item එක දැනට stock නැහැ");
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing && existing.quantity >= product.stockQuantity) { toast.error("Available stock limit එකට පැමිණ ඇත"); return current; }
      return existing ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { ...product, quantity: 1 }];
    });
    toast.success(`${product.nameSi} cart එකට එකතු කළා`);
  };
  const changeQuantity = (id: number, amount: number) => setCart((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.min(item.stockQuantity, Math.max(0, item.quantity + amount)) } : item).filter((item) => item.quantity > 0));
  const openCart = () => { setCheckoutStep("cart"); setCartOpen(true); };

  const submitOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (cart.length === 0) return toast.error("කරුණාකර භාණ්ඩයක් තෝරන්න");
    const customerName = form.customerName.trim();
    const phone = form.phone.trim();
    const area = form.area.trim();
    const address = form.address.trim();
    if (customerName.length < 2) return toast.error("කරුණාකර ඔබගේ නම ඇතුළත් කරන්න");
    if (phone.length < 9) return toast.error("කරුණාකර නිවැරදි දුරකථන අංකයක් ඇතුළත් කරන්න");
    if (area.length < 2) return toast.error("කරුණාකර ප්‍රදේශය ඇතුළත් කරන්න");
    if (address.length < 5) return toast.error("කරුණාකර අවම වශයෙන් අකුරු 5ක delivery ලිපිනයක් ඇතුළත් කරන්න");
    if (!form.privacyConsent) return toast.error("Order එක යැවීමට privacy consent එක තෝරන්න");
    try {
      const result = await createOrder.mutateAsync({ ...form, customerName, phone, area, address, privacyConsent: true, items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })) });
      const lines = cart.map((item) => `• ${item.nameSi} × ${item.quantity} — ${money(item.priceLkr * item.quantity)}`).join("\n");
      const message = [
        `*DEWMINI HARDWARE STORE*`,
        `━━━━━━━━━━━━━━━━`,
        `*නව Order Request එකක්*`,
        `Order No: *${result.orderNo}*`,
        ``,
        `*ORDER ITEMS*`,
        lines,
        ``,
        `*ORDER SUMMARY*`,
        `Subtotal: *${money(result.subtotalLkr)}*`,
        `Total: *${money(result.totalLkr)}* + delivery`,
        `Delivery charge: Staff විසින් confirm කරනු ඇත`,
        ``,
        `*CUSTOMER DETAILS*`,
        `නම: ${form.customerName}`,
        `දුරකථන: ${form.phone}`,
        `ප්‍රදේශය: ${form.area}`,
        `ලිපිනය: ${form.address}`,
        ``,
        `*DELIVERY REQUIREMENTS*`,
        `ලබාගන්නා ආකාරය: ${form.fulfilment === "delivery" ? "Delivery අවශ්‍යයි" : "Shop එකෙන් ලබාගන්නවා"}`,
        `අවශ්‍ය දිනය: ${form.requestedDate || "—"}`,
        `Delivery වේලාව: ${form.deliveryTime || "—"}`,
        `විශේෂ සටහන: ${form.specialNote || "—"}`,
        ``,
        `*PAYMENT*`,
        `${form.paymentMethod === "cod" ? "Cash on Delivery" : form.paymentMethod === "bank" ? "Bank Transfer" : "Shop payment"}`,
        ``,
        `කරුණාකර order එක confirm කර delivery details දැනුම් දෙන්න. ස්තුතියි!`,
      ].join("\n");
      setCart([]);
      setCartOpen(false);
      setCheckoutStep("cart");
      toast.success("Order එක සාර්ථකයි — WhatsApp එක විවෘත කරමින්...", { duration: 5000 });
      window.open(`https://wa.me/94778319024?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error && error.message.toLowerCase().includes("stock") ? "සමහර items වල stock අවසන්. Catalog එක refresh කරලා නැවත උත්සාහ කරන්න." : error instanceof Error && error.message.includes("address") ? "කරුණාකර නිවැරදි delivery ලිපිනයක් ඇතුළත් කරන්න." : "Order එක යැවීමට නොහැකි වුණා. නැවත උත්සාහ කරන්න.");
    }
  };

  return (
    <div className="site-shell">
      <div className="scroll-progress" />
      <header className="site-nav">
        <div className="nav-inner">
          <a href="#top" className="brand"><img src="/manus-storage/dewmini-logo_0804a5e7.webp" alt="Dewmini Hardware" width="42" height="42" decoding="async" /><span><b>DEWMINI</b><small>HARDWARE</small></span></a>
          <nav className="desktop-nav"><a href="#catalog">Catalog</a><a href="#why-us">Why Dewmini</a><a href="#contact">Contact</a></nav>
          <div className="nav-actions"><Link href="/my-orders" className="admin-link">My Orders</Link><Link href="/admin" className="admin-link">Staff login</Link><button className="cart-button" onClick={openCart}><ShoppingBag size={18} /><span>Cart</span>{cartCount > 0 && <b>{cartCount}</b>}</button><button className="mobile-menu"><Menu size={20} /></button></div>
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy" data-reveal><div className="kicker"><Sparkles size={15} /> olaboduwa trusted hardware partner</div><h1>Build it better.<br /><em>Start with the right</em> gear.</h1><p>ගෙදර වැඩක්ද, professional project එකක්ද — quality tools, materials සහ expert service එක එකම තැනක.</p><div className="hero-search"><Search size={18} /><Input value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Search tools, paint, plumbing..." aria-label="Search all Dewmini products" /></div><div className="hero-actions"><a className="primary-btn" href="#catalog">Shop the catalog <ArrowRight size={17} /></a><a className="text-btn" href="#contact">Visit our shop <MapPin size={16} /></a></div><div className="hero-proof"><span><b>10+</b><small>years in Olaboduwa</small></span><span><b>2k+</b><small>happy customers</small></span><span><b>Same day</b><small>order response</small></span></div></div>
          <div className="hero-art" data-reveal><div className="sun-shape" /><div className="tool-card tool-card-back"><span>READY FOR<br /><b>THE JOB</b></span><Hammer size={72} strokeWidth={1.3} /></div><div className="tool-card tool-card-front"><div className="tool-card-top"><span className="eyebrow">WORKSHOP ESSENTIAL</span><span className="round-arrow"><ArrowRight size={16} /></span></div><img src={img("photo-1530124566582-a618bc2615dc")} alt="Hand tools" width="280" height="237" fetchPriority="high" decoding="async" /><div><strong>Gear that works<br />as hard as you do.</strong><span className="orange-line" /></div></div><div className="hero-stamp"><span>EST.</span><b>2010</b><small>olaboduwa</small></div></div>
        </section>

        <section className="trust-strip" data-reveal><div><Truck size={19} /><span><b>Delivery available</b><small>olaboduwa & nearby areas</small></span></div><div><PackageCheck size={19} /><span><b>Genuine products</b><small>Quality checked stock</small></span></div><div><MessageCircle size={19} /><span><b>WhatsApp support</b><small>077 831 9024</small></span></div><div><Clock3 size={19} /><span><b>Fast response</b><small>We reply quickly</small></span></div></section>

        {globalSearch.trim().length > 1 && <section className="search-results-section" data-reveal><div className="section-heading"><div><div className="kicker">SEARCH RESULTS</div><h2>Found for “{globalSearch.trim()}”.</h2></div><span className="search-result-count">{searchQuery.data?.total ?? 0} products</span></div>{searchQuery.isLoading ? <div className="empty-state">Searching the Dewmini catalog...</div> : searchQuery.data?.items.length ? <div className="product-grid search-product-grid">{searchQuery.data.items.map((product) => <ProductCard key={product.id} product={product} onAdd={addToCart} />)}</div> : <div className="empty-state">No products matched. Try “paint”, “drill”, or “tools”.</div>}</section>}
        <section className="catalog-section category-home-section" id="catalog"><div className="section-heading"><div><div className="kicker">THE DEWMINI COLLECTION</div><h2>Shop by category.<br /><em>Find your perfect fit.</em></h2></div><Link className="catalog-view-all" href="/category/tools">View all <ArrowRight size={16} /></Link></div>
          <div className="category-dashboard">{categories.map((item, index) => <Link key={item.slug} href={`/category/${item.slug}`} className="category-tile"><img src={item.imageUrl} alt="" loading="lazy" decoding="async" /><span className="category-tile-copy"><small className="category-tile-count">{item.name.includes("Rental") ? "Rental service" : `${(index + 1) * 12 + 8} products`}</small><b>{item.name}</b><em>{item.label}</em><strong>Explore collection <ArrowRight size={15} /></strong></span><span className="category-tile-number">{String(index + 1).padStart(2, "0")}</span></Link>)}</div>
        </section>

        <section className="why-section" id="why-us"><div className="why-photo" data-reveal><img src={img("photo-1503387762-592deb58ef4e")} alt="Dewmini Hardware team at work" loading="lazy" decoding="async" /><div className="photo-caption"><span>THE DEWMINI WAY</span><b>Practical advice.<br />No guesswork.</b></div></div><div className="why-copy" data-reveal><div className="kicker">WHY SHOP WITH US</div><h2>Small shop.<br /><em>Serious standards.</em></h2><p>අපිට අවශ්‍ය ඔබට product එකක් විකුණන්න විතරක් නෙමෙයි. ඔබේ project එක හරියට complete කරන්න අවශ්‍ය උපදෙස්, trusted brands සහ fair prices දෙන්නයි.</p><div className="why-list"><div><span>01</span><p><b>Know what works</b><br />We help you choose the right product for the real job.</p></div><div><span>02</span><p><b>Order your way</b><br />Online catalog, WhatsApp support or a friendly shop visit.</p></div><div><span>03</span><p><b>Built for Sri Lanka</b><br />Stock selected for the work, weather and homes we know.</p></div></div></div></section>

        <section className="contact-section" id="contact" data-reveal><div><div className="kicker">COME SAY HELLO</div><h2>Let's get your<br /><em>next project moving.</em></h2></div><div className="contact-details"><p><MapPin size={18} /> Olaboduwa, Sri Lanka</p><p><MessageCircle size={18} /> +94 77 831 9024</p><a className="primary-btn" href="https://wa.me/94778319024" target="_blank" rel="noreferrer">Chat on WhatsApp <ArrowRight size={17} /></a></div></section>
      </main>
      <footer><div className="brand footer-brand"><img src="/manus-storage/dewmini-logo_0804a5e7.webp" alt="Dewmini Hardware" /><span><b>DEWMINI</b><small>HARDWARE</small></span></div><p>© 2026 Dewmini Hardware. Built for better work.</p><p><Link href="/my-orders">My Orders</Link> · <Link href="/privacy">Privacy Policy</Link> · WhatsApp</p></footer>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}><SheetContent className="cart-sheet"><SheetHeader><SheetTitle>{checkoutStep === "cart" ? <span className="sheet-title"><ShoppingBag size={20} /> Your cart <small>{cartCount} items</small></span> : <span className="sheet-title"><button className="back-button" onClick={() => setCheckoutStep("cart")}>←</button> Checkout details</span>}</SheetTitle></SheetHeader>
        {checkoutStep === "cart" ? <div className="cart-content">{cart.length === 0 ? <div className="cart-empty"><ShoppingBag size={42} strokeWidth={1.2} /><h3>Your cart is empty</h3><p>Catalog එකෙන් ඔබට අවශ්‍ය items එකතු කරන්න.</p><button className="primary-btn" onClick={() => setCartOpen(false)}>Browse catalog <ArrowRight size={16} /></button></div> : <><div className="cart-lines">{cart.map((item) => <div className="cart-line" key={item.id}><img src={item.imageUrl} alt="" /><div className="cart-line-copy"><b>{item.nameSi}</b><span>{money(item.priceLkr)}</span><div className="qty-control"><button onClick={() => changeQuantity(item.id, -1)}><Minus size={14} /></button><span>{item.quantity}</span><button onClick={() => changeQuantity(item.id, 1)}><Plus size={14} /></button></div></div><button className="remove-line" onClick={() => setCart((current) => current.filter((line) => line.id !== item.id))}><X size={16} /></button></div>)}</div><div className="cart-summary"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><p>Delivery charge එක staff විසින් confirm කරනු ඇත.</p><button className="primary-btn full-btn" onClick={() => setCheckoutStep("details")}>Continue to checkout <ArrowRight size={17} /></button></div></>}</div> : <form className="checkout-form" onSubmit={submitOrder}><div className="form-section"><div className="form-section-head"><span>01</span><div><b>CUSTOMER DETAILS</b><small>ඔබගේ විස්තර</small></div></div><div className="form-grid"><label><span>නම *</span><Input required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="උදා: කසුන් පෙරේරා" /></label><label><span>දුරකථන අංකය *</span><Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07XXXXXXXX" /></label><label><span>ප්‍රදේශය *</span><Input required value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="ගොනපොළ" /></label><label className="wide"><span>Delivery address *</span><Textarea required minLength={5} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="සම්පූර්ණ ලිපිනය" /></label></div></div><div className="form-section"><div className="form-section-head"><span>02</span><div><b>YOUR REQUIREMENTS</b><small>වැඩේට ගැළපෙන details</small></div></div><div className="form-grid"><label><span>අවශ්‍ය දිනය</span><Input type="date" value={form.requestedDate} onChange={(e) => setForm({ ...form, requestedDate: e.target.value })} /></label><label><span>Delivery වේලාව</span><Input value={form.deliveryTime} onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })} placeholder="උදා: පෙ.ව. 10 - 12" /></label><label className="wide"><span>විශේෂ සටහන</span><Textarea value={form.specialNote} onChange={(e) => setForm({ ...form, specialNote: e.target.value })} placeholder="ඔබට අපට කියන්න අවශ්‍ය දෙයක්..." /></label></div></div><div className="form-section"><div className="form-section-head"><span>03</span><div><b>FULFILMENT & PAYMENT</b><small>ලබාගන්නා ආකාරය සහ ගෙවීම</small></div></div><div className="choice-grid"><label className={form.fulfilment === "delivery" ? "choice-card selected" : "choice-card"}><input type="radio" checked={form.fulfilment === "delivery"} onChange={() => setForm({ ...form, fulfilment: "delivery" })} /><Truck size={20} /><span><b>Delivery අවශ්‍යයි</b><small>ඔබේ ලිපිනයට ගෙන්වා ගන්න</small></span></label><label className={form.fulfilment === "pickup" ? "choice-card selected" : "choice-card"}><input type="radio" checked={form.fulfilment === "pickup"} onChange={() => setForm({ ...form, fulfilment: "pickup" })} /><MapPin size={20} /><span><b>Shop එකෙන් ලබාගන්නවා</b><small>Kesbewa shop එකෙන් pickup</small></span></label></div><div className="payment-row"><Label>ගෙවීම් ක්‍රමය</Label><div className="payment-options">{[["cod", "Cash on Delivery"], ["bank", "Bank Transfer"], ["shop", "Shop payment"]].map(([value, label]) => <label key={value} className={form.paymentMethod === value ? "payment-pill selected" : "payment-pill"}><input type="radio" checked={form.paymentMethod === value} onChange={() => setForm({ ...form, paymentMethod: value as "cod" | "bank" | "shop" })} />{label}</label>)}</div></div></div><div className="checkout-total"><span>Order total <small>+ delivery charge to be confirmed</small></span><b>{money(subtotal)}</b></div><label className="privacy-consent"><input type="checkbox" checked={form.privacyConsent} onChange={(event) => setForm({ ...form, privacyConsent: event.target.checked })} required /><span>I agree that Dewmini Hardware may use my details to process this order. <Link href="/privacy" target="_blank">Read Privacy Policy</Link></span></label><input className="website-honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /><button className="primary-btn full-btn order-now" disabled={createOrder.isPending}> {createOrder.isPending ? "Sending order..." : <>ORDER NOW <ArrowRight size={18} /></>}</button><p className="privacy-note">ඔබගේ තොරතුරු Dewmini Hardware order එක process කිරීමට පමණක් භාවිතා කරනු ලැබේ.</p></form>}
      </SheetContent></Sheet>
    </div>
  );
}
