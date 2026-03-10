import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Redirect based on role
  if (session.role === "admin") {
    redirect("/admin");
  } else {
    redirect("/seller");
  }
}
