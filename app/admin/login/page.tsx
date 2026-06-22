import { redirect } from "next/navigation";

// The admin login is unified with the main sign-in. Signing in there routes
// staff to /admin and customers to the storefront automatically, so this URL
// just forwards to /login (kept as an alias so old links/bookmarks still work).
export default function AdminLoginPage() {
  redirect("/login");
}
