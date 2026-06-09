import { redirect } from "next/navigation";

/** Root → the hero Overview screen. */
export default function Home() {
  redirect("/overview");
}
