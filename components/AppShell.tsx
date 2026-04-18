import Link from "next/link";

import { LogoutButton } from "@/components/LogoutButton";

const navItems = [
  { href: "/competitions", label: "Compétitions" },
];

type AppShellProps = {
  children: React.ReactNode;
  showAdminNav?: boolean;
};

export function AppShell({ children, showAdminNav = false }: AppShellProps) {
  const visibleNavItems = showAdminNav
    ? [...navItems, { href: "/admin", label: "Admin" }]
    : navItems;

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" href="/">
          <span className="brand-mark">P</span>
          <span>
            <span className="brand-name">Pronos des potos</span>
            <span className="brand-tagline">Tournois entre amis</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Navigation principale">
          {visibleNavItems.map((item) => (
            <Link className="nav-link" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
          <LogoutButton />
        </nav>

        <details className="mobile-nav">
          <summary className="burger-button" aria-label="Ouvrir le menu">
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </summary>

          <nav className="mobile-nav-panel" aria-label="Navigation principale mobile">
            {visibleNavItems.map((item) => (
              <Link className="nav-link" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
            <LogoutButton />
          </nav>
        </details>
      </header>

      {children}
    </div>
  );
}
