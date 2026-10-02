const fs = require('fs').promises;
const path = require('path');

const rootFilepath = path.join(__dirname, '../db.json');
const dbFolderFilepath = path.join(__dirname, 'db.json');

async function readData() {
  try {
    const data = await fs.readFile(rootFilepath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    const data = await fs.readFile(dbFolderFilepath, 'utf8');
    return JSON.parse(data);
  }
}

async function writeData(data) {
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(rootFilepath, content, 'utf8');
  try {
    await fs.writeFile(dbFolderFilepath, content, 'utf8');
  } catch (err) {}
}

module.exports = {
  readData,
  writeData
};
