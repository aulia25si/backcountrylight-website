import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, Heart, Settings, User, MapPin, Award } from "lucide-react";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?callbackUrl=/account");
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-7xl">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-muted/50 p-6 rounded-lg mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-primary text-primary-foreground h-12 w-12 rounded-full flex items-center justify-center text-xl font-medium">
                {session.user.name?.charAt(0) || "U"}
              </div>
              <div>
                <p className="font-medium">{session.user.name}</p>
                <p className="text-sm text-muted-foreground">{session.user.email}</p>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            <Link 
              href="/account" 
              className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-muted transition-colors text-sm font-medium"
            >
              <Package className="h-4 w-4" />
              My Orders
            </Link>
            <Link 
              href="/membership" 
              className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-muted transition-colors text-sm font-medium text-amber-600 dark:text-amber-500"
            >
              <Award className="h-4 w-4" />
              Membership Partner
            </Link>
            <Link 
              href="/account/wishlist" 
              className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-muted transition-colors text-sm font-medium"
            >
              <Heart className="h-4 w-4" />
              Wishlist
            </Link>
            <Link 
              href="/account/address" 
              className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-muted transition-colors text-sm font-medium"
            >
              <MapPin className="h-4 w-4" />
              Address Book
            </Link>
            <Link 
              href="/account/settings" 
              className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-muted transition-colors text-sm font-medium"
            >
              <Settings className="h-4 w-4" />
              Account Settings
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
