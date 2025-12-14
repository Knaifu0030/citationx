import { Layout } from "@/components/layout";
import { SearchExperience } from "@/components/search-experience";
import { TransparencyPanel } from "@/components/transparency-panel";
import { ShortcutGuide } from "@/components/shortcut-guide";

export default function Home() {
  return (
    <Layout>
      <SearchExperience />
      <TransparencyPanel />
      <ShortcutGuide />
    </Layout>
  );
}
