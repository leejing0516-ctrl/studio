
import { listAll, ref, getDownloadURL, getBlob } from "firebase/storage";
import { storage } from "./firebase";

export async function listImages(prefix = "avatars/") {
  const r = ref(storage, prefix);
  const { items } = await listAll(r);
  return Promise.all(items.map(async (it) => {
    const url = await getDownloadURL(it);
    return { name: it.name, url };
    // 若要拉回原始檔：
    // const blob = await getBlob(it);
    // return { name: it.name, blob };
  }));
}
