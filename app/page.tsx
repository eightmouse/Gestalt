import { ArchiveOS } from "@/components/archive-os";
import { getRecords } from "@/lib/content";

export default function Home() {
  const records = getRecords();

  return <ArchiveOS records={records} />;
}
