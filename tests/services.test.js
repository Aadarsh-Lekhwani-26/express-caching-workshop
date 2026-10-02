const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../database/db');
const productService = require('../services/productService');

const seedData = [
  { id: 1, name: 'Keyboard', price: 49.99 },
  { id: 2, name: 'Mouse', price: 19.99 },
  { id: 3, name: 'Monitor', price: 199 },
  { id: 4, name: 'Mouse', price: 19 }
];

describe('Product Service Layer', () => {
  beforeEach(async () => {
    await db.writeData(seedData);
  });

  afterEach(async () => {
    await db.writeData(seedData);
  });

  test('getAllProducts returns all products', async () => {
    const products = await productService.getAllProducts();
    assert.ok(Array.isArray(products));
    assert.equal(products.length, 4);
  });

  test('getProductById returns the correct product for valid id', async () => {
    const product = await productService.getProductById(1);
    assert.ok(product);
    assert.equal(product.id, 1);
  });

  test('getProductById returns undefined for non-existent id', async () => {
    const product = await productService.getProductById(9999);
    assert.equal(product, undefined);
  });

  test('createProduct adds a new product and persists it', async () => {
    const created = await productService.createProduct({ name: 'Webcam', price: 79.99 });
    assert.ok(created.id);
    assert.equal(created.name, 'Webcam');
    assert.equal(created.price, 79.99);

    const products = await productService.getAllProducts();
    const found = products.find((p) => p.id === created.id);
    assert.ok(found);
  });

  test('updateProduct updates an existing product', async () => {
    const updated = await productService.updateProduct(1, { name: 'Mechanical Keyboard', price: 99.99 });
    assert.ok(updated);
    assert.equal(updated.name, 'Mechanical Keyboard');
    assert.equal(updated.price, 99.99);

    const fetched = await productService.getProductById(1);
    assert.equal(fetched.name, 'Mechanical Keyboard');
  });

  test('updateProduct returns null if product does not exist', async () => {
    const result = await productService.updateProduct(9999, { name: 'None', price: 0 });
    assert.equal(result, null);
  });

  test('patchProduct updates partial fields on an existing product', async () => {
    const original = await productService.getProductById(2);
    const patched = await productService.patchProduct(2, { price: 29.99 });
    assert.ok(patched);
    assert.equal(patched.price, 29.99);
    assert.equal(patched.name, original.name);
  });

  test('patchProduct returns null if product does not exist', async () => {
    const result = await productService.patchProduct(9999, { price: 10 });
    assert.equal(result, null);
  });

  test('deleteProduct removes product from database', async () => {
    const deleted = await productService.deleteProduct(1);
    assert.ok(deleted);
    assert.equal(deleted.id, 1);

    const fetched = await productService.getProductById(1);
    assert.equal(fetched, undefined);
  });

  test('deleteProduct returns null if product does not exist', async () => {
    const result = await productService.deleteProduct(9999);
    assert.equal(result, null);
  });
});
