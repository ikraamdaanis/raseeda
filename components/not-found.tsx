import { Link } from "@tanstack/react-router";
import { INK_PILL, SOFT_PILL } from "~/components/home/site-chrome";
import { StatusPage } from "~/components/status-page";

export function NotFound() {
  return (
    <StatusPage
      eyebrow="404"
      title={
        <>
          <span className="block">This page</span>
          <span className="block">isn’t here.</span>
        </>
      }
      description="The link may be old or mistyped. Your invoices are still saved in this browser, on this device."
      actions={
        <>
          <Link to="/create" className={INK_PILL}>
            Open the editor
          </Link>
          <Link to="/" className={SOFT_PILL}>
            Back to home
          </Link>
        </>
      }
    />
  );
}
