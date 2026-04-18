import Link from "next/link";

import { LogoutButton } from "@/components/LogoutButton";

const navItems = [
  { href: "/competitions", label: "Compétitions" },
  { href: "/admin", label: "Admin" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
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
          {navItems.map((item) => (
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
            {navItems.map((item) => (
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
