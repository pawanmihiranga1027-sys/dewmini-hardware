import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ClipboardList,
  Copy,
  ExternalLink,
  ImagePlus,
  KeyRound,
  LayoutDashboard,
  LogIn,
  MessageCircle,
  Package,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Tag,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";

const money = (value: number) =>
  `රු ${new Intl.NumberFormat("en-LK").format(value)}`;
type ProductForm = {
  name: string;
  nameSi: string;
  category: string;
  description: string;
  priceLkr: string;
  stockQuantity: string;
  imageUrl: string;
  galleryImages: string;
  badge: string;
  isFeatured: boolean;
  isActive: boolean;
};
type CategoryForm = {
  slug: string;
  name: string;
  label: string;
  imageUrl: string;
  sortOrder: string;
  isActive: boolean;
};
type OrderStatus = "pending" | "confirmed" | "completed" | "cancelled";
type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
const blankForm: ProductForm = {
  name: "",
  nameSi: "",
  category: "Tools",
  description: "",
  priceLkr: "",
  stockQuantity: "0",
  imageUrl: "",
  galleryImages: "",
  badge: "",
  isFeatured: false,
  isActive: true,
};
const blankCategoryForm: CategoryForm = {
  slug: "",
  name: "",
  label: "",
  imageUrl: "",
  sortOrder: "0",
  isActive: true,
};
export const getPreferredAdminTab = (staffRole: string | null) =>
  staffRole === "admin" || staffRole === "manager" ? "catalog" : "orders";
export const canManageStaffAccess = (
  staffRole: string | null,
  isOwner: boolean,
  accountRole?: string | null
) => isOwner || staffRole === "admin" || accountRole === "admin";

export default function Admin() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const loginMutation = trpc.auth.login.useMutation();
  const staffRole = user?.staffRole ?? null;
  const isStaff = Boolean(staffRole);
  const canManageCatalog = staffRole === "admin" || staffRole === "manager";
  const isOwner = Boolean(user?.isOwner);
  const twoFactorEnabled = Boolean(user?.totpEnabled);
  const twoFactorVerified = Boolean(user?.twoFactorVerified);
  const [activeTab, setActiveTab] = useState<"catalog" | "orders">(() =>
    getPreferredAdminTab(staffRole)
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(blankForm);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [categoryEditingId, setCategoryEditingId] = useState<number | null>(
    null
  );
  const [categoryForm, setCategoryForm] =
    useState<CategoryForm>(blankCategoryForm);
  const [search, setSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorSetup, setTwoFactorSetup] = useState<{
    secret: string;
    uri: string;
  } | null>(null);
  useEffect(() => {
    if (staffRole) setActiveTab(getPreferredAdminTab(staffRole));
  }, [staffRole]);

  const dataEnabled = isStaff && (!twoFactorEnabled || twoFactorVerified);
  const productsQuery = trpc.admin.products.list.useQuery(undefined, {
    enabled: dataEnabled,
  });
  const categoriesQuery = trpc.admin.categories.list.useQuery(undefined, {
    enabled: canManageCatalog && dataEnabled,
  });
  const ordersQuery = trpc.admin.orders.recent.useQuery(undefined, {
    enabled: dataEnabled,
  });
  const orderDetailQuery = trpc.admin.orders.detail.useQuery(
    { id: selectedOrderId ?? 0 },
    { enabled: Boolean(selectedOrderId) && dataEnabled }
  );
  const totpStatus = trpc.admin.security.totp.status.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const utils = trpc.useUtils();
  const createProduct = trpc.admin.products.create.useMutation({
    onSuccess: () => {
      toast.success("Product එක add කළා");
      void utils.admin.products.list.invalidate();
      setForm(blankForm);
      setEditingId(null);
    },
  });
  const updateProduct = trpc.admin.products.update.useMutation({
    onSuccess: () => {
      toast.success("Product එක update කළා");
      void utils.admin.products.list.invalidate();
      setForm(blankForm);
      setEditingId(null);
    },
  });
  const uploadImage = trpc.admin.products.uploadImage.useMutation({
    onSuccess: ({ url }) => {
      setForm(current => ({ ...current, imageUrl: url }));
      toast.success("Image එක upload කළා");
    },
    onError: error => toast.error(error.message),
  });
  const uploadGalleryImage = trpc.admin.products.uploadImage.useMutation({
    onSuccess: ({ url }) => {
      setForm(current => ({
        ...current,
        galleryImages: current.galleryImages
          ? `${current.galleryImages}\n${url}`
          : url,
      }));
      toast.success("Gallery image එක add කළා");
    },
    onError: error => toast.error(error.message),
  });
  const uploadCategoryImage = trpc.admin.products.uploadImage.useMutation({
    onSuccess: ({ url }) => {
      setCategoryForm(current => ({ ...current, imageUrl: url }));
      toast.success("Catalog image එක upload කළා");
    },
    onError: error => toast.error(error.message),
  });
  const createCategory = trpc.admin.categories.create.useMutation({
    onSuccess: () => {
      toast.success("New catalog එක add කළා");
      void categoriesQuery.refetch();
      setCategoryForm(blankCategoryForm);
      setCategoryEditingId(null);
    },
    onError: error => toast.error(error.message),
  });
  const updateCategory = trpc.admin.categories.update.useMutation({
    onSuccess: () => {
      toast.success("Catalog එක update කළා");
      void categoriesQuery.refetch();
      setCategoryForm(blankCategoryForm);
      setCategoryEditingId(null);
    },
    onError: error => toast.error(error.message),
  });
  const archiveCategory = trpc.admin.categories.archive.useMutation({
    onSuccess: () => {
      toast.success("Catalog එක archive කළා");
      void categoriesQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const archiveProduct = trpc.admin.products.archive.useMutation({
    onSuccess: () => {
      toast.success("Product එක archive කළා");
      void utils.admin.products.list.invalidate();
    },
  });
  const updateOrderStatus = trpc.admin.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Order status එක update කළා");
      void utils.admin.orders.recent.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const deleteCompletedOrder = trpc.admin.orders.deleteCompleted.useMutation({
    onSuccess: () => {
      toast.success("Delivered order එක delete කළා");
      void utils.admin.orders.recent.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const setupTotp = trpc.admin.security.totp.setup.useMutation({
    onSuccess: data => {
      setTwoFactorSetup(data);
      toast.success("QR code එක scan කරලා authenticator code එක දෙන්න");
    },
    onError: error => toast.error(error.message),
  });
  const enableTotp = trpc.admin.security.totp.enable.useMutation({
    onSuccess: async () => {
      setTwoFactorSetup(null);
      setTwoFactorCode("");
      toast.success("Authenticator 2FA enabled");
      await utils.auth.me.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const verifyTotp = trpc.admin.security.totp.verify.useMutation({
    onSuccess: async () => {
      setTwoFactorCode("");
      toast.success("Secure staff session unlocked");
      await utils.auth.me.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const disableTotp = trpc.admin.security.totp.disable.useMutation({
    onSuccess: async () => {
      toast.success("Authenticator 2FA disabled");
      await utils.auth.me.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const products = productsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const filtered = useMemo(
    () =>
      products.filter(product =>
        `${product.name} ${product.nameSi} ${product.category}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [products, search]
  );
  const dataError = productsQuery.error?.message || ordersQuery.error?.message;

  const startEdit = (product: (typeof products)[number]) => {
    setEditingId(product.id);
    let galleryImages = "";
    try {
      galleryImages = product.galleryImages
        ? (JSON.parse(product.galleryImages) as string[]).join("\n")
        : "";
    } catch {
      galleryImages = "";
    }
    setForm({
      name: product.name,
      nameSi: product.nameSi,
      category: product.category,
      description: product.description,
      priceLkr: String(product.priceLkr),
      stockQuantity: String(product.stockQuantity),
      imageUrl: product.imageUrl,
      galleryImages,
      badge: product.badge ?? "",
      isFeatured: product.isFeatured,
      isActive: product.isActive,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const startCategoryEdit = (category: (typeof categories)[number]) => {
    setCategoryEditingId(category.id);
    setCategoryForm({
      slug: category.slug,
      name: category.name,
      label: category.label,
      imageUrl: category.imageUrl,
      sortOrder: String(category.sortOrder),
      isActive: category.isActive,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  const submitCategory = (event: React.FormEvent) => {
    event.preventDefault();
    const data = {
      ...categoryForm,
      slug: slugify(categoryForm.slug || categoryForm.name),
      sortOrder: Number(categoryForm.sortOrder),
      imageUrl: categoryForm.imageUrl.trim(),
    };
    if (
      !data.imageUrl.startsWith("http") &&
      !data.imageUrl.startsWith("/manus-storage")
    )
      return toast.error("Catalog image එකක් තෝරන්න හෝ valid URL එකක් දෙන්න");
    if (categoryEditingId)
      updateCategory.mutate({ id: categoryEditingId, data });
    else createCategory.mutate(data);
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const gallery = form.galleryImages
      .split(/[\n,]+/)
      .map(url => url.trim())
      .filter(Boolean);
    if (gallery.length > 8)
      return toast.error("Maximum additional images 8ක් පමණයි");
    if (
      gallery.some(
        url => !url.startsWith("http") && !url.startsWith("/manus-storage")
      )
    )
      return toast.error("Additional image URLs valid URLs විය යුතුයි");
    const data = {
      ...form,
      priceLkr: Number(form.priceLkr),
      stockQuantity: Number(form.stockQuantity),
      galleryImages: gallery.length ? JSON.stringify(gallery) : null,
      badge: form.badge || null,
    };
    if (
      !data.imageUrl.startsWith("http") &&
      !data.imageUrl.startsWith("/manus-storage")
    )
      return toast.error("Valid image URL එකක් දෙන්න");
    if (editingId) updateProduct.mutate({ id: editingId, data });
    else createProduct.mutate(data);
  };
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const allowed: ImageMime[] = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!allowed.includes(file.type as ImageMime))
      return toast.error("JPG, PNG, WEBP or GIF image එකක් තෝරන්න");
    if (file.size > 5 * 1024 * 1024)
      return toast.error("Image එක 5MB ට වඩා අඩු විය යුතුයි");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string")
        uploadImage.mutate({
          fileName: file.name,
          contentType: file.type as ImageMime,
          data: reader.result,
        });
    };
    reader.readAsDataURL(file);
  };
  const handleGalleryUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const allowed: ImageMime[] = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!allowed.includes(file.type as ImageMime))
      return toast.error("JPG, PNG, WEBP or GIF image එකක් තෝරන්න");
    if (file.size > 5 * 1024 * 1024)
      return toast.error("Image එක 5MB ට වඩා අඩු විය යුතුයි");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string")
        uploadGalleryImage.mutate({
          fileName: file.name,
          contentType: file.type as ImageMime,
          data: reader.result,
        });
    };
    reader.readAsDataURL(file);
  };
  const handleCategoryImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const allowed: ImageMime[] = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!allowed.includes(file.type as ImageMime))
      return toast.error("JPG, PNG, WEBP or GIF image එකක් තෝරන්න");
    if (file.size > 5 * 1024 * 1024)
      return toast.error("Image එක 5MB ට වඩා අඩු විය යුතුයි");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string")
        uploadCategoryImage.mutate({
          fileName: file.name,
          contentType: file.type as ImageMime,
          data: reader.result,
        });
    };
    reader.readAsDataURL(file);
  };

  if (loading)
    return (
      <div className="admin-loading">
        <div className="loader-orbit" />
        <p>Staff access checking...</p>
      </div>
    );
  if (!isAuthenticated)
    return (
      <div className="admin-gate">
        <div className="gate-card">
          <div className="gate-icon">
            <ShieldCheck size={28} />
          </div>
          <div className="kicker">STAFF AREA</div>
          <h1>Dewmini control room.</h1>
          <div className="space-y-3">
  <input
    type="email"
    placeholder="Email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className="w-full rounded-lg border px-3 py-2"
  />

  <input
    type="password"
    placeholder="Password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="w-full rounded-lg border px-3 py-2"
  />
</div>
         <Button
  className="primary-btn full-btn"
  disabled={loginMutation.isPending}
  onClick={async () => {
    try {
      await loginMutation.mutateAsync({
        email,
        password,
      });

      window.location.reload();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Login failed"
      );
    }
  }}
>
  <LogIn size={17} />
  {loginMutation.isPending ? "Logging in..." : "Staff Login"}
</Button>
          <Link href="/" className="back-home">
            <ArrowLeft size={15} /> Back to shop
          </Link>
        </div>
      </div>
    );
  if (!isStaff)
    return (
      <div className="admin-gate">
        <div className="gate-card">
          <div className="gate-icon">
            <X size={28} />
          </div>
          <div className="kicker">ACCESS RESTRICTED</div>
          <h1>Staff access only.</h1>
          <p>
            මෙම control room එකට owner විසින් add කළ staff accounts ලට පමණයි
            access තියෙන්නේ.
          </p>
          <button className="text-btn" onClick={() => logout()}>
            Sign out and switch account <ArrowLeft size={15} />
          </button>
          <Link href="/" className="back-home">
            <ArrowLeft size={15} /> Back to shop
          </Link>
        </div>
      </div>
    );
  if (twoFactorEnabled && !twoFactorVerified)
    return (
      <div className="admin-gate">
        <div className="gate-card">
          <div className="gate-icon">
            <KeyRound size={28} />
          </div>
          <div className="kicker">AUTHENTICATOR REQUIRED</div>
          <h1>Unlock your control room.</h1>
          <p>
            Google Authenticator, Microsoft Authenticator හෝ වෙනත් TOTP app
            එකෙන් අංක 6ක code එක ඇතුළත් කරන්න.
          </p>
          <form
            onSubmit={event => {
              event.preventDefault();
              verifyTotp.mutate({ code: twoFactorCode });
            }}
          >
            <Input
              autoFocus
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={twoFactorCode}
              onChange={event =>
                setTwoFactorCode(event.target.value.replace(/\D/g, ""))
              }
              placeholder="000000"
              className="totp-input"
            />
            <Button
              className="primary-btn full-btn"
              disabled={verifyTotp.isPending || twoFactorCode.length !== 6}
            >
              <KeyRound size={17} />{" "}
              {verifyTotp.isPending ? "Checking..." : "Unlock control room"}
            </Button>
          </form>
          <button className="text-btn" onClick={() => logout()}>
            Sign out <ArrowLeft size={15} />
          </button>
          <Link href="/" className="back-home">
            <ArrowLeft size={15} /> Back to shop
          </Link>
        </div>
      </div>
    );

  const showCatalog = activeTab === "catalog" && canManageCatalog;
  const canManageStaff = canManageStaffAccess(staffRole, isOwner, user?.role);
  const safeUser = user as NonNullable<typeof user>;
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-brand">
          <img src="/manus-storage/dewmini-logo_0804a5e7.webp" alt="Dewmini" />
          <span>
            <b>DEWMINI</b>
            <small>CONTROL ROOM</small>
          </span>
        </Link>
        <div className="admin-side-nav">
          <button
            disabled={!canManageCatalog}
            className={`${activeTab === "catalog" ? "active" : ""} ${!canManageCatalog ? "disabled" : ""}`}
            onClick={() => setActiveTab("catalog")}
          >
            <LayoutDashboard size={18} /> Catalog
          </button>
          <button
            className={activeTab === "orders" ? "active" : ""}
            onClick={() => setActiveTab("orders")}
          >
            <ClipboardList size={18} /> Orders{" "}
            {ordersQuery.data?.length ? <b>{ordersQuery.data.length}</b> : null}
          </button>
          {canManageStaff && (
            <Link href="/admin/staff" className="side-link">
              <UsersRound size={18} /> Staff access
            </Link>
          )}
        </div>
        <div className="side-note">
          <ShieldCheck size={16} />
          <p>
            <b>
              {staffRole === "admin"
                ? "Admin"
                : staffRole === "manager"
                  ? "Manager"
                  : "Order Staff"}{" "}
              access
            </b>
            <br />
            {canManageStaff
              ? "You can manage staff access and roles."
              : "Your permissions are controlled by the owner."}
          </p>
        </div>
        <button className="side-signout" onClick={() => logout()}>
          Sign out <ArrowLeft size={15} />
        </button>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <div className="kicker">
              GOOD MORNING, {safeUser.name?.split(" ")[0] || "TEAM"}
            </div>
            <h1>{showCatalog ? "Catalog manager" : "Order inbox"}</h1>
          </div>
          <div className="topbar-actions">
            <a href="/" target="_blank" rel="noreferrer" className="view-shop">
              <ExternalLink size={16} /> View shop
            </a>
            <div className="avatar">
              {(safeUser.name || "D").slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>
        {showCatalog ? (
          <div className="admin-catalog-view">
            {(productsQuery.isLoading || ordersQuery.isLoading) && (
              <div className="admin-loading admin-inline-loading">
                <div className="loader-orbit" />
                <p>Loading catalog data...</p>
              </div>
            )}
            {dataError && (
              <div className="admin-error-banner">
                <ShieldCheck size={17} />
                <div>
                  <b>Catalog data could not be loaded.</b>
                  <span>{dataError}</span>
                </div>
                <button
                  onClick={() => {
                    void productsQuery.refetch();
                    void ordersQuery.refetch();
                  }}
                >
                  Try again
                </button>
              </div>
            )}
            {canManageStaff && (
              <section className="security-panel">
                <div>
                  <div className="kicker">STAFF SECURITY</div>
                  <h2>
                    <KeyRound size={18} /> Authenticator 2FA
                  </h2>
                  <p>
                    {totpStatus.data?.enabled
                      ? "This staff account is protected by a 6-digit authenticator challenge."
                      : "Protect catalog, customer details, and order actions with an authenticator app."}
                  </p>
                </div>
                {totpStatus.data?.enabled ? (
                  <button
                    type="button"
                    className="product-action archive"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Disable authenticator 2FA for this staff account?"
                        )
                      )
                        disableTotp.mutate();
                    }}
                    disabled={disableTotp.isPending}
                  >
                    <ShieldCheck size={15} /> Disable 2FA
                  </button>
                ) : twoFactorSetup ? (
                  <div className="totp-setup">
                    <QRCodeSVG
                      value={twoFactorSetup.uri}
                      size={116}
                      bgColor="#10131a"
                      fgColor="#ffffff"
                    />
                    <div>
                      <b>Scan this QR</b>
                      <small>
                        Or enter secret: <code>{twoFactorSetup.secret}</code>
                      </small>
                      <form
                        onSubmit={event => {
                          event.preventDefault();
                          enableTotp.mutate({ code: twoFactorCode });
                        }}
                      >
                        <Input
                          inputMode="numeric"
                          maxLength={6}
                          value={twoFactorCode}
                          onChange={event =>
                            setTwoFactorCode(
                              event.target.value.replace(/\D/g, "")
                            )
                          }
                          placeholder="6-digit code"
                        />
                        <button
                          className="primary-btn"
                          disabled={
                            enableTotp.isPending || twoFactorCode.length !== 6
                          }
                        >
                          <Check size={15} /> Enable
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => setupTotp.mutate()}
                    disabled={setupTotp.isPending}
                  >
                    <KeyRound size={15} /> Set up authenticator
                  </button>
                )}
              </section>
            )}
            <section className="admin-stats">
              <div>
                <span>
                  <Package size={17} />
                </span>
                <b>{products.length}</b>
                <small>Total products</small>
              </div>
              <div>
                <span>
                  <Tag size={17} />
                </span>
                <b>{categories.filter(category => category.isActive).length}</b>
                <small>Live catalogs</small>
              </div>
              <div>
                <span>
                  <ClipboardList size={17} />
                </span>
                <b>{ordersQuery.data?.length ?? 0}</b>
                <small>Recent orders</small>
              </div>
            </section>
            <section className="category-manager-panel">
              <div className="manager-head">
                <div>
                  <div className="kicker">STORE NAVIGATION</div>
                  <h2>
                    {categoryEditingId ? "Edit catalog" : "Add a new catalog"}
                  </h2>
                  <p className="panel-helper">
                    Catalog name, image, description සහ order එක මෙතනින් manage
                    කරන්න.
                  </p>
                </div>
                {categoryEditingId && (
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => {
                      setCategoryEditingId(null);
                      setCategoryForm(blankCategoryForm);
                    }}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <div className="category-manager-layout">
                <form
                  className="category-editor-form"
                  onSubmit={submitCategory}
                >
                  <div className="admin-form-grid">
                    <label>
                      <span>Catalog name</span>
                      <Input
                        required
                        value={categoryForm.name}
                        onChange={e =>
                          setCategoryForm({
                            ...categoryForm,
                            name: e.target.value,
                          })
                        }
                        placeholder="Garden & Outdoor"
                      />
                    </label>
                    <label>
                      <span>URL slug</span>
                      <Input
                        value={categoryForm.slug}
                        onChange={e =>
                          setCategoryForm({
                            ...categoryForm,
                            slug: slugify(e.target.value),
                          })
                        }
                        placeholder="garden-and-outdoor"
                      />
                    </label>
                    <label className="admin-wide">
                      <span>Short description</span>
                      <Input
                        required
                        value={categoryForm.label}
                        onChange={e =>
                          setCategoryForm({
                            ...categoryForm,
                            label: e.target.value,
                          })
                        }
                        placeholder="Garden tools & outdoor essentials"
                      />
                    </label>
                    <label>
                      <span>Display order</span>
                      <Input
                        type="number"
                        min="0"
                        value={categoryForm.sortOrder}
                        onChange={e =>
                          setCategoryForm({
                            ...categoryForm,
                            sortOrder: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="admin-wide">
                      <span>Catalog image</span>
                      <div className="image-upload-row">
                        <label className="upload-file-btn">
                          <ImagePlus size={16} />{" "}
                          {uploadCategoryImage.isPending
                            ? "Uploading..."
                            : "Choose image from PC"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={handleCategoryImageUpload}
                            disabled={uploadCategoryImage.isPending}
                          />
                        </label>
                        <Input
                          required
                          value={categoryForm.imageUrl}
                          onChange={e =>
                            setCategoryForm({
                              ...categoryForm,
                              imageUrl: e.target.value,
                            })
                          }
                          placeholder="Paste URL or upload from PC"
                        />
                      </div>
                      {categoryForm.imageUrl && (
                        <div className="image-preview-row">
                          <img
                            src={categoryForm.imageUrl}
                            alt="Catalog preview"
                          />
                          <small>Preview ready · Save to publish</small>
                        </div>
                      )}
                    </label>
                  </div>
                  <div className="toggle-row">
                    <label>
                      <Switch
                        checked={categoryForm.isActive}
                        onCheckedChange={checked =>
                          setCategoryForm({
                            ...categoryForm,
                            isActive: checked,
                          })
                        }
                      />
                      <span>Show on storefront</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={
                      createCategory.isPending || updateCategory.isPending
                    }
                  >
                    {categoryEditingId ? (
                      <>
                        <Check size={17} /> Save catalog
                      </>
                    ) : (
                      <>
                        <Plus size={17} /> Add catalog
                      </>
                    )}
                  </button>
                </form>
                <div className="category-admin-list">
                  {categories.map(category => (
                    <div className="category-admin-row" key={category.id}>
                      <img src={category.imageUrl} alt="" loading="lazy" />
                      <div>
                        <b>{category.name}</b>
                        <small>{category.label}</small>
                        <em>
                          {category.isActive
                            ? "Live on storefront"
                            : "Archived"}
                        </em>
                      </div>
                      <button
                        type="button"
                        className="product-action edit"
                        onClick={() => startCategoryEdit(category)}
                      >
                        <Pencil size={15} /> Edit
                      </button>
                      <button
                        type="button"
                        className="product-action archive"
                        onClick={() =>
                          archiveCategory.mutate({ id: category.id })
                        }
                        disabled={!category.isActive}
                      >
                        <Trash2 size={15} /> Archive
                      </button>
                    </div>
                  ))}
                  {!categories.length && (
                    <div className="admin-empty">
                      <Tag size={26} />
                      <p>No catalog categories found yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
            <section className="admin-editor-grid">
              <form className="editor-card" onSubmit={submit}>
                <div className="editor-heading">
                  <div>
                    <div className="kicker">
                      {editingId ? "EDIT PRODUCT" : "ADD PRODUCT"}
                    </div>
                    <h2>
                      {editingId
                        ? "Update catalog item"
                        : "Bring in something new"}
                    </h2>
                  </div>
                  {editingId && (
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => {
                        setEditingId(null);
                        setForm(blankForm);
                      }}
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                <div className="admin-form-grid">
                  <label>
                    <span>Product name</span>
                    <Input
                      required
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="Professional Claw Hammer"
                    />
                  </label>
                  <label>
                    <span>Sinhala name</span>
                    <Input
                      required
                      value={form.nameSi}
                      onChange={e =>
                        setForm({ ...form, nameSi: e.target.value })
                      }
                      placeholder="ප්‍රොෆෙෂනල් ක්ලෝ හැමර්"
                    />
                  </label>
                  <label>
                    <span>Category</span>
                    <Input
                      required
                      value={form.category}
                      onChange={e =>
                        setForm({ ...form, category: e.target.value })
                      }
                      placeholder="Tools"
                    />
                  </label>
                  <label>
                    <span>Price (LKR)</span>
                    <Input
                      required
                      type="number"
                      min="1"
                      value={form.priceLkr}
                      onChange={e =>
                        setForm({ ...form, priceLkr: e.target.value })
                      }
                      placeholder="2850"
                    />
                  </label>
                  <label>
                    <span>Stock quantity</span>
                    <Input
                      required
                      type="number"
                      min="0"
                      value={form.stockQuantity}
                      onChange={e =>
                        setForm({ ...form, stockQuantity: e.target.value })
                      }
                      placeholder="25"
                    />
                  </label>
                  <label className="admin-wide">
                    <span>Product image</span>
                    <div className="image-upload-row">
                      <label className="upload-file-btn">
                        <ImagePlus size={16} />{" "}
                        {uploadImage.isPending
                          ? "Uploading..."
                          : "Choose image from PC"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleImageUpload}
                          disabled={uploadImage.isPending}
                        />
                      </label>
                      <Input
                        required
                        value={form.imageUrl}
                        onChange={e =>
                          setForm({ ...form, imageUrl: e.target.value })
                        }
                        placeholder="Or paste an image URL / storage path"
                      />
                    </div>
                    {form.imageUrl && (
                      <div className="image-preview-row">
                        <img
                          src={form.imageUrl}
                          alt="Selected product preview"
                        />
                        <small>Preview ready · Save changes to apply</small>
                      </div>
                    )}
                  </label>
                  <label className="admin-wide">
                    <span>Additional product images</span>
                    <div className="gallery-upload-row">
                      <label className="upload-file-btn">
                        <ImagePlus size={16} />{" "}
                        {uploadGalleryImage.isPending
                          ? "Uploading..."
                          : "Upload gallery image"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleGalleryUpload}
                          disabled={uploadGalleryImage.isPending}
                        />
                      </label>
                      <small className="field-hint">
                        Upload from PC or paste one image URL per line below.
                      </small>
                    </div>
                    <Textarea
                      value={form.galleryImages}
                      onChange={e =>
                        setForm({ ...form, galleryImages: e.target.value })
                      }
                      placeholder="One image URL per line (up to 8)"
                    />
                    <small className="field-hint">
                      These appear as selectable images on the product detail
                      page.
                    </small>
                  </label>
                  <label>
                    <span>Badge (optional)</span>
                    <Input
                      value={form.badge}
                      onChange={e =>
                        setForm({ ...form, badge: e.target.value })
                      }
                      placeholder="Best seller"
                    />
                  </label>
                  <label className="admin-wide">
                    <span>Description</span>
                    <Textarea
                      required
                      value={form.description}
                      onChange={e =>
                        setForm({ ...form, description: e.target.value })
                      }
                      placeholder="Short helpful description..."
                    />
                  </label>
                </div>
                <div className="toggle-row">
                  <label>
                    <Switch
                      checked={form.isFeatured}
                      onCheckedChange={checked =>
                        setForm({ ...form, isFeatured: checked })
                      }
                    />
                    <span>Feature on homepage</span>
                  </label>
                  <label>
                    <Switch
                      checked={form.isActive}
                      onCheckedChange={checked =>
                        setForm({ ...form, isActive: checked })
                      }
                    />
                    <span>Live in catalog</span>
                  </label>
                </div>
                <button
                  type="submit"
                  className="primary-btn full-btn"
                  disabled={createProduct.isPending || updateProduct.isPending}
                >
                  {editingId ? (
                    <>
                      <Check size={17} /> Save changes
                    </>
                  ) : (
                    <>
                      <Plus size={17} /> Add to catalog
                    </>
                  )}
                </button>
              </form>
              <section className="product-manager-card">
                <div className="manager-head">
                  <div>
                    <div className="kicker">YOUR PRODUCTS</div>
                    <h2>Live catalog</h2>
                  </div>
                  <label className="search-box">
                    <Search size={16} />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Find a product"
                    />
                  </label>
                </div>
                <div className="admin-product-list">
                  {filtered.map(product => (
                    <div className="admin-product-row" key={product.id}>
                      <img src={product.imageUrl} alt="" />
                      <div className="admin-product-info">
                        <b>{product.nameSi}</b>
                        <small>
                          {product.category} ·{" "}
                          {product.isActive ? "Live" : "Archived"}
                        </small>
                      </div>
                      <strong>{money(product.priceLkr)}</strong>
                      <span
                        className={
                          product.stockQuantity > 0
                            ? "stock-chip"
                            : "stock-chip out-of-stock"
                        }
                      >
                        {product.stockQuantity > 0
                          ? `${product.stockQuantity} in stock`
                          : "Out of stock"}
                      </span>
                      <div className="product-actions">
                        <button
                          type="button"
                          className="product-action edit"
                          title="Edit product"
                          onClick={() => startEdit(product)}
                        >
                          <Pencil size={15} /> Edit
                        </button>
                        <button
                          type="button"
                          className="product-action archive"
                          title="Archive product"
                          onClick={() =>
                            archiveProduct.mutate({ id: product.id })
                          }
                        >
                          <Trash2 size={15} /> Archive
                        </button>
                      </div>
                    </div>
                  ))}
                  {filtered.length === 0 && (
                    <div className="admin-empty">
                      <Package size={26} />
                      <p>
                        {search
                          ? "No matching products."
                          : "No catalog products found yet."}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </section>
          </div>
        ) : (
          <section className="orders-panel">
            <div className="orders-panel-head">
              <div>
                <div className="kicker">CUSTOMER REQUESTS</div>
                <h2>Recent orders</h2>
                <p className="panel-helper">
                  View incoming orders and follow up with customers.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => void ordersQuery.refetch()}
              >
                <Settings2 size={15} /> Refresh
              </Button>
            </div>
            {ordersQuery.error && (
              <div className="admin-error-banner">
                <ShieldCheck size={17} />
                <div>
                  <b>Orders could not be loaded.</b>
                  <span>{ordersQuery.error.message}</span>
                </div>
                <button onClick={() => void ordersQuery.refetch()}>
                  Try again
                </button>
              </div>
            )}
            <div className="orders-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Fulfilment</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Received</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersQuery.data?.map(order => (
                    <tr
                      key={order.id}
                      className="order-row-clickable"
                      tabIndex={0}
                      onClick={() => setSelectedOrderId(order.id)}
                      onKeyDown={event => {
                        if (event.key === "Enter" || event.key === " ")
                          setSelectedOrderId(order.id);
                      }}
                    >
                      <td>
                        <b>{order.orderNo}</b>
                        <small>Click to view details</small>
                      </td>
                      <td>
                        <b>{order.customerName}</b>
                        <small>
                          {order.phone}
                          <br />
                          {order.area}
                        </small>
                      </td>
                      <td>
                        {order.fulfilment === "delivery"
                          ? "Delivery"
                          : "Pickup"}
                      </td>
                      <td>
                        <b>{money(order.totalLkr)}</b>
                      </td>
                      <td>
                        <select
                          className={`status-select ${order.status}`}
                          value={order.status}
                          disabled={updateOrderStatus.isPending}
                          onClick={event => event.stopPropagation()}
                          onChange={event =>
                            updateOrderStatus.mutate({
                              id: order.id,
                              status: event.target.value as OrderStatus,
                            })
                          }
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td>
                        {new Date(order.createdAt).toLocaleDateString("en-LK")}
                      </td>
                      <td>
                        {order.status === "completed" && canManageStaff && (
                          <button
                            type="button"
                            className="product-action archive"
                            title="Delete delivered order"
                            disabled={deleteCompletedOrder.isPending}
                            onClick={event => {
                              event.stopPropagation();
                              if (
                                window.confirm(
                                  `Delivered order ${order.orderNo} එක permanently delete කරන්නද?`
                                )
                              )
                                deleteCompletedOrder.mutate({ id: order.id });
                            }}
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!ordersQuery.data?.length && (
                <div className="admin-empty">
                  <ClipboardList size={26} />
                  <p>
                    Orders area is ready. New WhatsApp orders will appear here.
                  </p>
                </div>
              )}
              {selectedOrderId && orderDetailQuery.data && (
                <section className="order-detail-panel">
                  <div className="order-detail-head">
                    <div>
                      <div className="kicker">
                        ORDER DETAIL · {orderDetailQuery.data.order.orderNo}
                      </div>
                      <h2>{orderDetailQuery.data.order.customerName}</h2>
                      <p>
                        Status updated{" "}
                        {new Date(
                          orderDetailQuery.data.order.statusUpdatedAt
                        ).toLocaleString("en-LK")}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => setSelectedOrderId(null)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="order-detail-grid">
                    <div className="order-detail-card">
                      <h3>Customer & delivery</h3>
                      <p>
                        <b>Phone</b>
                        {orderDetailQuery.data.order.phone}
                      </p>
                      <p>
                        <b>Area</b>
                        {orderDetailQuery.data.order.area}
                      </p>
                      <p>
                        <b>Full address</b>
                        {orderDetailQuery.data.order.address}
                      </p>
                      <p>
                        <b>Preferred time</b>
                        {orderDetailQuery.data.order.deliveryTime ||
                          "Not specified"}
                      </p>
                      <p>
                        <b>Special note</b>
                        {orderDetailQuery.data.order.specialNote || "None"}
                      </p>
                    </div>
                    <div className="order-detail-card">
                      <h3>Items & payment</h3>
                      {orderDetailQuery.data.items.map(item => (
                        <p className="detail-item-line" key={item.id}>
                          <span>
                            {item.productName} × {item.quantity}
                          </span>
                          <b>{money(item.lineTotalLkr)}</b>
                        </p>
                      ))}
                      <p className="detail-total-line">
                        <span>Total</span>
                        <b>{money(orderDetailQuery.data.order.totalLkr)}</b>
                      </p>
                      <p>
                        <b>Payment</b>
                        {orderDetailQuery.data.order.paymentMethod}
                      </p>
                    </div>
                    <div className="order-detail-card">
                      <h3>Audit history</h3>
                      {orderDetailQuery.data.audit.length ? (
                        orderDetailQuery.data.audit.map(event => (
                          <p className="audit-line" key={event.id}>
                            <span>{event.action.replace(/_/g, " ")}</span>
                            <small>
                              {event.fromStatus || ""}{" "}
                              {event.toStatus ? `→ ${event.toStatus}` : ""} ·{" "}
                              {new Date(event.createdAt).toLocaleString(
                                "en-LK"
                              )}
                            </small>
                          </p>
                        ))
                      ) : (
                        <p>No audit events recorded yet.</p>
                      )}
                    </div>
                    <div className="order-detail-card">
                      <h3><MessageCircle size={14} /> Customer notifications</h3>
                      <p className="field-hint">Queued automatically. Connect a WhatsApp/SMS provider to dispatch these without changing the order workflow.</p>
                      {orderDetailQuery.data.notifications.length ? orderDetailQuery.data.notifications.map(notification => (
                        <div className="notification-line" key={notification.id}>
                          <span>{notification.status} · {notification.channel}</span>
                          <small>{new Date(notification.createdAt).toLocaleString("en-LK")}</small>
                          <div>
                            <button type="button" className="product-action edit" onClick={() => { void navigator.clipboard?.writeText(notification.message); toast.success("Notification message copied"); }}><Copy size={13} /> Copy</button>
                            <a className="product-action edit" href={`https://wa.me/${notification.recipient.replace(/\D/g, "")}?text=${encodeURIComponent(notification.message)}`} target="_blank" rel="noreferrer"><MessageCircle size={13} /> WhatsApp</a>
                          </div>
                        </div>
                      )) : <p>No notification queued yet.</p>}
                    </div>
                  </div>
                </section>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
