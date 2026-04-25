"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/src/lib/cn";
import { useDismissibleLayer } from "@/src/lib/use-dismissible-layer";
import { usePresence } from "@/src/lib/use-presence";

const navItems = [
  { href: "/competitions", label: "Compétitions" },
  { href: "/mon-compte", label: "Mon compte" },
];

type AppShellProps = {
  children: React.ReactNode;
  showAdminNav?: boolean;
};

export function AppShell({ children, showAdminNav = false }: AppShellProps) {
  const mobileNavButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavPanelRef = useRef<HTMLElement>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const visibleNavItems = showAdminNav
    ? [...navItems, { href: "/admin", label: "Admin" }]
    : navItems;
  const mobileNavPresence = usePresence(isMobileNavOpen);

  useDismissibleLayer({
    active: isMobileNavOpen,
    ignoreRefs: [mobileNavButtonRef],
    layerRef: mobileNavPanelRef,
    onDismiss: () => {
      setIsMobileNavOpen(false);
    },
  });

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="brand" href="/competitions">
            <span className="brand-mark">P</span>
            <span>
              <span className="brand-name">Pronos des potos</span>
              <span className="brand-tagline">Tournois entre amis</span>
            </span>
          </Link>

          <div className="header-tools">
            <ThemeToggle />

            <nav className="site-nav" aria-label="Navigation principale">
              {visibleNavItems.map((item) => (
                <Link
                  className={cn(
                    "nav-link nav-link-desktop",
                    pathname.startsWith(item.href) && "nav-link-active",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
              <LogoutButton className="nav-link-desktop nav-link-logout" />
            </nav>

            <div className="mobile-nav">
              <button
                aria-expanded={isMobileNavOpen}
                aria-label="Ouvrir le menu"
                className={`burger-button${isMobileNavOpen ? " is-open" : ""}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsMobileNavOpen(isMobileNavOpen ? false : true);
                }}
                ref={mobileNavButtonRef}
                type="button"
              >
                <span aria-hidden="true" />
                <span aria-hidden="true" />
                <span aria-hidden="true" />
              </button>

              {mobileNavPresence.isMounted ? (
                <>
                  <div
                    className={`mobile-nav-backdrop${mobileNavPresence.isVisible ? " is-open" : ""}`}
                  />
                  <nav
                    aria-label="Navigation principale mobile"
                    className={`mobile-nav-panel${mobileNavPresence.isVisible ? " is-open" : ""}`}
                    onClick={() => {
                      setIsMobileNavOpen(false);
                    }}
                    ref={mobileNavPanelRef}
                  >
                    {visibleNavItems.map((item) => (
                      <Link
                        className={cn(
                          "nav-link nav-link-mobile",
                          pathname.startsWith(item.href) && "nav-link-active",
                        )}
                        href={item.href}
                        key={item.href}
                      >
                        {item.label}
                      </Link>
                    ))}
                    <LogoutButton className="nav-link-mobile nav-link-logout" />
                  </nav>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
