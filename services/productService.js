const db = require('../database/db');

async function getAllProducts() {
  return await db.readData();
}

async function getProductById(id) {
  const products = await db.readData();
  return products.find((product) => product.id === id);
}

async function createProduct(productData) {
  const products = await db.readData();
  const nextId = products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;
  const newProduct = {
    id: nextId,
    name: productData.name,
    price: productData.price
  };
  products.push(newProduct);
  await db.writeData(products);
  return newProduct;
}

async function updateProduct(id, productData) {
  const products = await db.readData();
  const index = products.findIndex((product) => product.id === id);
  if (index === -1) {
    return null;
  }
  const updatedProduct = {
    id,
    name: productData.name,
    price: productData.price
  };
  products[index] = updatedProduct;
  await db.writeData(products);
  return updatedProduct;
}

async function patchProduct(id, productData) {
  const products = await db.readData();
  const index = products.findIndex((product) => product.id === id);
  if (index === -1) {
    return null;
  }
  const updatedProduct = {
    ...products[index],
    ...productData,
    id
  };
  products[index] = updatedProduct;
  await db.writeData(products);
  return updatedProduct;
}

async function deleteProduct(id) {
  const products = await db.readData();
  const index = products.findIndex((product) => product.id === id);
  if (index === -1) {
    return null;
  }
  const [deletedProduct] = products.splice(index, 1);
  await db.writeData(products);
  return deletedProduct;
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  patchProduct,
  deleteProduct
};
