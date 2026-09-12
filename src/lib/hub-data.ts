import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/integrations/firebase/client";
import {
  BRANDING_DOC_ID,
  COLLECTIONS,
  USER_APP_PREFS_SUB,
  type AppCategory,
  type AppDoc,
  type ProfileDoc,
} from "@/integrations/firebase/schema";

export type AppRecord = AppDoc & { id: string };

/**
 * The apps collection holds a handful of documents, so everything is fetched
 * once ordered by sortOrder and filtered in memory. Filtering in the query
 * instead would need a composite index for every category/isActive combination.
 */
export async function listApps(): Promise<AppRecord[]> {
  const snap = await getDocs(query(collection(db, COLLECTIONS.apps), orderBy("sortOrder", "asc")));
  return snap.docs.map((entry) => {
    const data = entry.data() as Partial<AppDoc>;
    return {
      id: entry.id,
      slug: data.slug ?? entry.id,
      name: data.name ?? entry.id,
      nameEn: data.nameEn ?? null,
      description: data.description ?? null,
      descriptionEn: data.descriptionEn ?? null,
      url: data.url ?? "",
      icon: data.icon ?? "layout-grid",
      accent: data.accent ?? "primary",
      category: data.category === "business" ? "business" : "social",
      allowedRedirectPrefixes: data.allowedRedirectPrefixes ?? [],
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive !== false,
    };
  });
}

/** App ids this user has hidden from their own launcher. */
export async function listHiddenAppIds(uid: string): Promise<Set<string>> {
  const snap = await getDocs(collection(db, COLLECTIONS.userAppPrefs, uid, USER_APP_PREFS_SUB));
  const hidden = new Set<string>();
  for (const entry of snap.docs) {
    if ((entry.data() as { hidden?: boolean }).hidden === true) hidden.add(entry.id);
  }
  return hidden;
}

export async function setAppHidden(uid: string, appId: string, hidden: boolean): Promise<void> {
  await setDoc(
    doc(db, COLLECTIONS.userAppPrefs, uid, USER_APP_PREFS_SUB, appId),
    { hidden, updatedAt: new Date() },
    { merge: true },
  );
}

export async function listVisibleApps(uid: string, category: AppCategory): Promise<AppRecord[]> {
  const [apps, hidden] = await Promise.all([listApps(), listHiddenAppIds(uid)]);
  return apps.filter((app) => app.isActive && app.category === category && !hidden.has(app.id));
}

export async function getProfile(uid: string): Promise<ProfileDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.profiles, uid));
  if (!snap.exists()) return null;
  const data = snap.data() as Partial<ProfileDoc>;
  return {
    displayName: data.displayName ?? null,
    avatarUrl: data.avatarUrl ?? null,
    lineUserId: data.lineUserId ?? null,
    email: data.email ?? null,
  };
}

/* ---------- admin ---------- */

export async function saveApp(id: string | null, payload: AppDoc): Promise<void> {
  const ref = id ? doc(db, COLLECTIONS.apps, id) : doc(collection(db, COLLECTIONS.apps));
  await setDoc(ref, { ...payload, updatedAt: new Date() }, { merge: true });
}

export async function deleteApp(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.apps, id));
}

export async function saveBrandingText(text: {
  brandName: string;
  brandNameEn: string | null;
  tagline: string;
  taglineEn: string | null;
}): Promise<void> {
  await setDoc(
    doc(db, COLLECTIONS.branding, BRANDING_DOC_ID),
    { ...text, updatedAt: new Date() },
    { merge: true },
  );
}

/** Upload a new logo and record its public download URL on the branding doc. */
export async function uploadBrandingLogo(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `branding/logo-${Date.now()}.${extension}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType: file.type });
  const url = await getDownloadURL(fileRef);
  await updateDoc(doc(db, COLLECTIONS.branding, BRANDING_DOC_ID), {
    logoPath: path,
    logoUrl: url,
    updatedAt: new Date(),
  });
  return url;
}
