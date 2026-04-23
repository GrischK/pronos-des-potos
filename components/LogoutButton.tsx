import { cn } from "@/src/lib/cn";
import { logoutAction } from "@/src/auth/actions";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  return (
    <form action={logoutAction}>
      <button className={cn("nav-link nav-button", className)} type="submit">
        Déconnexion
      </button>
    </form>
  );
}
