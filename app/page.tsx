import { ChatWidget } from "@/app/components/ChatWidget";
import { HomePageContent } from "@/app/components/HomePageContent";
import { JsonLd } from "@/app/components/JsonLd";
import { NavBar } from "@/app/components/NavBar";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <JsonLd />
      <NavBar />
      <HomePageContent />
      <ChatWidget />
    </div>
  );
}
