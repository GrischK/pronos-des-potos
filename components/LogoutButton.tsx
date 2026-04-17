import { logoutAction } from "@/src/auth/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button className="nav-link nav-button" type="submit">
        Déconnexion
      </button>
    </form>
  );
}
