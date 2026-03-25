import { ChatWidget } from "@/app/components/ChatWidget";
import { HomePageContent } from "@/app/components/HomePageContent";
import { JsonLd } from "@/app/components/JsonLd";
import { NavBar } from "@/app/components/NavBar";

export default function HomePage() {
  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <JsonLd />
      <NavBar />
      <HomePageContent />
      <ChatWidget />
    </div>
  );
}
