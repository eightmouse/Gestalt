import { ArchiveOS } from "@/components/archive-os";
import { getRecords } from "@/lib/content";
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: { media: "(max-width: 760px)", color: "#171a1b" }
};

export default function Home() {
  const records = getRecords();

  return <ArchiveOS records={records} />;
}
