import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../config/firebase";

const STORAGE_PATH = "averias";

export const subirImagen = async (averiaId, archivo, indice) => {
  const extension = archivo.type.split("/")[1] || "jpg";
  const nombreArchivo = `foto_${indice}.${extension}`;
  const ruta = `${STORAGE_PATH}/${averiaId}/${nombreArchivo}`;
  const storageRef = ref(storage, ruta);

  await uploadBytes(storageRef, archivo, { contentType: archivo.type });
  const url = await getDownloadURL(storageRef);
  return url;
};

export const subirMultiplesImagenes = async (averiaId, archivos) => {
  const urls = [];
  for (let i = 0; i < archivos.length; i++) {
    const url = await subirImagen(averiaId, archivos[i], i + 1);
    urls.push(url);
  }
  return urls;
};

export const eliminarImagen = async (averiaId, indice) => {
  const ruta = `${STORAGE_PATH}/${averiaId}/foto_${indice + 1}.jpg`;
  const storageRef = ref(storage, ruta);
  try {
    await deleteObject(storageRef);
  } catch (error) {
    if (error.code !== "storage/object-not-found") {
      throw error;
    }
  }
};

export const eliminarTodasLasImagenes = async (averiaId) => {
  const { listAll } = await import("firebase/storage");
  const ruta = `${STORAGE_PATH}/${averiaId}`;
  const listaRef = ref(storage, ruta);

  try {
    const resultado = await listAll(listaRef);
    const promesas = resultado.items.map((itemRef) => deleteObject(itemRef));
    await Promise.all(promesas);
  } catch (error) {
    if (error.code !== "storage/object-not-found") {
      throw error;
    }
  }
};
