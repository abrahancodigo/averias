import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  updateDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";

const COLLECTION = "usuarios";
const PAGE_SIZE = 20;

export const crearUsuario = async (uid, email, rol = "operador") => {
  const docRef = await addDoc(collection(db, COLLECTION), {
    uid,
    email,
    rol,
    created_at: new Date().toISOString(),
  });
  return docRef.id;
};

export const obtenerUsuarioPorUid = async (uid) => {
  const q = query(collection(db, COLLECTION), where("uid", "==", uid), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
};

export const actualizarRol = async (id, nuevoRol) => {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, { rol: nuevoRol });
};

export const eliminarUsuario = async (id) => {
  await deleteDoc(doc(db, COLLECTION, id));
};

export const obtenerUsuariosPaginados = async (lastVisible = null) => {
  let q;
  if (lastVisible) {
    q = query(
      collection(db, COLLECTION),
      orderBy("email"),
      startAfter(lastVisible),
      limit(PAGE_SIZE)
    );
  } else {
    q = query(
      collection(db, COLLECTION),
      orderBy("email"),
      limit(PAGE_SIZE)
    );
  }
  const snapshot = await getDocs(q);
  const usuarios = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
  return { usuarios, lastVisible: newLastVisible };
};

export const contarUsuarios = async () => {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.size;
};