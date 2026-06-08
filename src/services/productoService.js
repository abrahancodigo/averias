import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  deleteDoc,
  doc,
  writeBatch,
  limit,
  updateDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";

const COLLECTION = "productos";
const BATCH_LIMIT = 500;

export const agregarProducto = async (producto) => {
  const docRef = await addDoc(collection(db, COLLECTION), {
    codigo: producto.codigo,
    nombre: producto.nombre,
    precio: producto.precio || 0,
    created_at: new Date().toISOString(),
  });
  return docRef.id;
};

export const agregarProductos = async (productos) => {
  let total = 0;
  for (let i = 0; i < productos.length; i += BATCH_LIMIT) {
    const lote = productos.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    for (const p of lote) {
      const docRef = doc(collection(db, COLLECTION));
      batch.set(docRef, {
        codigo: p.codigo,
        nombre: p.nombre,
        created_at: new Date().toISOString(),
      });
    }
    await batch.commit();
    total += lote.length;
  }
  return total;
};

export const buscarProductos = async (termino) => {
  const term = termino.toLowerCase().trim();
  if (!term) return [];

  const snapshot = await getDocs(
    query(collection(db, COLLECTION), orderBy("nombre"), limit(50))
  );
  const todos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  return todos.filter(
    (p) =>
      p.codigo?.toLowerCase().includes(term) ||
      p.nombre?.toLowerCase().includes(term)
  );
};

export const obtenerProductos = async () => {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const existeProducto = async (codigo) => {
  const q = query(
    collection(db, COLLECTION),
    where("codigo", "==", codigo),
    limit(1)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

export const eliminarProductos = async () => {
  const snapshot = await getDocs(collection(db, COLLECTION));
  let eliminados = 0;
  for (let i = 0; i < snapshot.docs.length; i += BATCH_LIMIT) {
    const lote = snapshot.docs.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    lote.forEach((d) => batch.delete(doc(db, COLLECTION, d.id)));
    await batch.commit();
    eliminados += lote.length;
  }
  return eliminados;
};

export const obtenerProductoPorCodigo = async (codigo) => {
  const q = query(
    collection(db, COLLECTION),
    where("codigo", "==", codigo),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

export const actualizarProducto = async (id, producto) => {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    codigo: producto.codigo,
    nombre: producto.nombre,
    precio: producto.precio || 0,
    updated_at: new Date().toISOString(),
  });
};