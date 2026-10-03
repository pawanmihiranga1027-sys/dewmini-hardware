import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, ArrowRight, Search, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { catalogCategories, categorySlug, ProductCard, type CatalogCategory, type CatalogProduct } from "@/pages/Home";

export default function CategoryPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const categoriesQuery = trpc.catalog.categories.useQuery();
  const categories: CatalogCategory[] = categoriesQuery.data?.length ? categoriesQuery.data : catalogCategories.map((item) => ({ ...item, slug: categorySlug(item.name), imageUrl: item.image }));
  const category = categories.find((item) => item.slug === slug);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const input = useMemo(() => ({ category: category?.name, search: search.trim() || undefined, page, pageSize: 12 }), [category?.name, page, search]);
  const query = trpc.catalog.list.useQuery(input, { enabled: Boolean(category) });
  const products = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / 12));

  const addToCart = (product: CatalogProduct) => {
    try {
      const saved = localStorage.getItem("dewmini-cart");
      const cart = saved ? JSON.parse(saved) as Array<CatalogProduct & { quantity: number }> : [];
      const existing = cart.find((item) => item.id === product.id);
      const next = existing ? cart.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...cart, { ...product, quantity: 1 }];
      localStorage.setItem("dewmini-cart", JSON.stringify(next));
      toast.success(`${product.nameSi} cart එකට එකතු කළා`);
    } catch { toast.error("Cart එක update කරන්න බැරි වුණා"); }
  };

  if (!category) return <div className="category-not-found"><h1>Category not found</h1><Link href="/" className="primary-btn">Back to categories <ArrowRight size={16} /></Link></div>;

  const isPaint = slug === "paint";
  const isJcb = slug === "jcb-and-excavator-rental";
  return <div className={`category-page category-${slug}`}><header className="category-header"><Link href="/" className="category-brand"><img src="/manus-storage/dewmini-logo_0804a5e7.webp" alt="Dewmini Hardware" width="42" height="42" decoding="async" /><span><b>DEWMINI</b><small>HARDWARE</small></span></Link><Link href="/?cart=1" className="cart-link"><ShoppingBag size={16} /> Cart</Link></header><main><div className="category-hero"><div className="category-scene" aria-hidden="true"><span className="scene-orb" /><span className="scene-grid" />{isPaint && <><span className="paint-swipe paint-swipe-one" /><span className="paint-swipe paint-swipe-two" /><span className="paint-brush"><i /></span></>}{isJcb && <span className="scene-machine-glow" />}</div><div className="category-hero-copy"><Link href="/#catalog" className="back-category"><ArrowLeft size={14} /> All categories</Link><div className="kicker">CATEGORY COLLECTION</div><h1>{category.name}</h1><p>{category.label}. Choose what you need, search by name, and add items to your order.</p></div><img src={category.imageUrl} alt="" width="520" height="320" fetchPriority="high" decoding="async" /></div><div className="category-toolbar"><div><div className="kicker">{total} ITEMS FOUND</div><h2>{category.name}</h2></div><label className="search-box"><Search size={17} /><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={`Search in ${category.name}...`} /></label></div><div className="category-result-bar"><span>{total > 0 ? `Showing ${(page - 1) * 12 + 1}–${Math.min(page * 12, total)} of ${total} items` : "No matching items"}</span><span>Search this category only</span></div>{query.isLoading ? <div className="category-loading">Loading products...</div> : products.length > 0 ? <div className="product-grid category-product-grid">{products.map((product) => <ProductCard key={product.id} product={product} onAdd={addToCart} />)}</div> : <div className="empty-state"><h3>No products in this category yet.</h3><p>Try another search or return to all categories.</p></div>}{pageCount > 1 && <div className="pagination"><button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>← Previous</button><span>Page <b>{page}</b> of {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next →</button></div>}</main></div>;
}
