const express = require('express');
const productRoutes = require('./routes/productRoutes');

const app = express();
const port = 3000;

app.use(express.json());
app.use('/products', productRoutes);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = app;
