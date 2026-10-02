const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../database/db');

const seedData = [
  { id: 1, name: 'Keyboard', price: 49.99 },
  { id: 2, name: 'Mouse', price: 19.99 },
  { id: 3, name: 'Monitor', price: 199 },
  { id: 4, name: 'Mouse', price: 19 }
];

describe('Database Layer', () => {
  beforeEach(async () => {
    await db.writeData(seedData);
  });

  afterEach(async () => {
    await db.writeData(seedData);
  });

  test('readData returns an array of products', async () => {
    const data = await db.readData();
    assert.ok(Array.isArray(data));
    assert.equal(data.length, 4);
    assert.equal(data[0].id, 1);
    assert.equal(data[0].name, 'Keyboard');
  });

  test('writeData writes and persists data correctly', async () => {
    const testProducts = [{ id: 999, name: 'Test Item', price: 10 }];
    await db.writeData(testProducts);
    const updatedData = await db.readData();
    assert.equal(updatedData.length, 1);
    assert.equal(updatedData[0].name, 'Test Item');
  });
});
