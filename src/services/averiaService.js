import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../config/firebase";

const COLLECTION = "averias";

export const registrarAveria = async (averia, fotosBase64) => {
  const docRef = await addDoc(collection(db, COLLECTION), {
    codigo: averia.codigo,
    producto: averia.producto,
    precio: parseFloat(averia.precio) || 0,
    estado: averia.estado,
    observaciones: averia.observaciones,
    fotos: fotosBase64,
    created_at: new Date().toISOString(),
  });
  return docRef.id;
};

export const actualizarAveria = async (id, averia, fotos) => {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    codigo: averia.codigo,
    producto: averia.producto,
    precio: parseFloat(averia.precio) || 0,
    estado: averia.estado,
    observaciones: averia.observaciones,
    fotos: fotos,
  });
};

export const obtenerAverias = async () => {
  const q = query(collection(db, COLLECTION), orderBy("created_at", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const obtenerAveriasPorFecha = async (fechaInicio, fechaFin) => {
  const inicio = new Date(fechaInicio);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(fechaFin);
  fin.setHours(23, 59, 59, 999);

  const q = query(
    collection(db, COLLECTION),
    where("created_at", ">=", inicio.toISOString()),
    where("created_at", "<=", fin.toISOString()),
    orderBy("created_at", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const eliminarAveria = async (id) => {
  await deleteDoc(doc(db, COLLECTION, id));
};