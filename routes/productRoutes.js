const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');

router.get('/', cacheMiddleware, productController.getAllProducts);
router.get('/:id', cacheMiddleware, productController.getProductById);

router.post('/', invalidateCache, productController.createProduct);
router.put('/:id', invalidateCache, productController.updateProduct);
router.patch('/:id', invalidateCache, productController.patchProduct);
router.delete('/:id', invalidateCache, productController.deleteProduct);

module.exports = router;
