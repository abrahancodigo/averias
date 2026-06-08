import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  writeBatch,
  limit,
  updateDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";

const COLLECTION = "productos";
const BATCH_LIMIT = 500;

let cacheProductos = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000;

const cargarCache = async () => {
  const ahora = Date.now();
  if (cacheProductos && ahora - cacheTimestamp < CACHE_TTL) {
    return cacheProductos;
  }
  const snapshot = await getDocs(collection(db, COLLECTION));
  cacheProductos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  cacheTimestamp = ahora;
  return cacheProductos;
};

export const invalidarCache = () => {
  cacheProductos = null;
  cacheTimestamp = 0;
};

export const agregarProducto = async (producto) => {
  const docRef = await addDoc(collection(db, COLLECTION), {
    codigo: producto.codigo,
    nombre: producto.nombre,
    precio: producto.precio || 0,
    created_at: new Date().toISOString(),
  });
  invalidarCache();
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
        precio: p.precio || 0,
        created_at: new Date().toISOString(),
      });
    }
    await batch.commit();
    total += lote.length;
  }
  invalidarCache();
  return total;
};

export const buscarProductos = async (termino) => {
  const term = termino.toLowerCase().trim();
  if (!term) return [];

  const productos = await cargarCache();

  return productos
    .filter(
      (p) =>
        p.codigo?.toLowerCase().includes(term) ||
        p.nombre?.toLowerCase().includes(term)
    )
    .slice(0, 15);
};

export const obtenerProductos = async () => {
  return cargarCache();
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
  invalidarCache();
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
  invalidarCache();
};