import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Check, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import type { CatalogProduct } from "@/pages/Home";

const money = (value: number) => `රු ${new Intl.NumberFormat("en-LK").format(value)}`;

export default function ProductDetails() {
  const { id = "" } = useParams<{ id: string }>();
  const productQuery = trpc.catalog.product.useQuery({ id: Number(id) }, { enabled: Number.isInteger(Number(id)) && Number(id) > 0 });
  const product = productQuery.data as CatalogProduct | undefined;
  const gallery = useMemo(() => {
    if (!product) return [];
    try {
      const parsed = product.galleryImages ? JSON.parse(product.galleryImages) as unknown : [];
      return [product.imageUrl, ...(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [])].filter((url, index, list) => list.indexOf(url) === index);
    } catch { return [product.imageUrl]; }
  }, [product]);
  const [selectedImage, setSelectedImage] = useState(0);

  const addToCart = () => {
    if (!product) return;
    try {
      const saved = localStorage.getItem("dewmini-cart");
      const cart = saved ? JSON.parse(saved) as Array<CatalogProduct & { quantity: number }> : [];
      const existing = cart.find((item) => item.id === product.id);
      const next = existing ? cart.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...cart, { ...product, quantity: 1 }];
      localStorage.setItem("dewmini-cart", JSON.stringify(next));
      toast.success(`${product.nameSi} cart එකට එකතු කළා`);
    } catch { toast.error("Cart එක update කරන්න බැරි වුණා"); }
  };

  if (productQuery.isLoading) return <div className="product-detail-state"><div className="loader-orbit" /><p>Product details loading...</p></div>;
  if (productQuery.isError || !product) return <div className="product-detail-state"><h1>Product not found</h1><Link href="/" className="primary-btn"><ArrowLeft size={16} /> Back to store</Link></div>;

  const categoryPath = product.category.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return <div className="product-detail-page"><header className="category-header"><Link href="/" className="category-brand"><img src="/manus-storage/dewmini-logo_0804a5e7.webp" alt="Dewmini Hardware" width="42" height="42" decoding="async" /><span><b>DEWMINI</b><small>HARDWARE</small></span></Link><Link href="/?cart=1" className="cart-link"><ShoppingBag size={16} /> Cart</Link></header><main className="product-detail-shell"><Link href={`/category/${categoryPath}`} className="back-category"><ArrowLeft size={14} /> Back to {product.category}</Link><div className="product-detail-grid"><section className="detail-gallery"><div className="detail-main-image"><img src={gallery[selectedImage] || product.imageUrl} alt={product.nameSi} fetchPriority="high" decoding="async" /><span className="detail-image-count">{selectedImage + 1} / {gallery.length}</span></div>{gallery.length > 1 && <div className="detail-thumbnails">{gallery.map((image, index) => <button key={image} type="button" className={selectedImage === index ? "selected" : ""} onClick={() => setSelectedImage(index)}><img src={image} alt={`${product.nameSi} view ${index + 1}`} loading="lazy" /></button>)}</div>}</section><section className="detail-copy"><div className="eyebrow">{product.category}</div><h1>{product.nameSi}</h1><p className="detail-english-name">{product.name}</p>{product.badge && <span className="detail-badge">{product.badge}</span>}<p className="detail-description">{product.description}</p><div className="detail-price">{money(product.priceLkr)}</div><div className="detail-actions"><Button className="primary-btn" onClick={addToCart}><ShoppingBag size={17} /> Add to cart</Button><Link href="/?cart=1" className="detail-cart-link"><Check size={16} /> View cart</Link></div><div className="detail-trust"><span><Check size={15} /> Genuine stock</span><span><Check size={15} /> WhatsApp ordering</span><span><Check size={15} /> Islandwide support</span></div></section></div></main></div>;
}
