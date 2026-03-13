import { Router } from 'express';
import { getOrders, getStoreCustomers, createOrder } from '../../controllers/store/store-orders.controller';
import { getWishlist, addToWishlist, removeFromWishlist } from '../../controllers/store/store-wishlist.controller';
import { updateProfile, addAddress, updateAddress, deleteAddress } from '../../controllers/store/store-profile.controller';
import { getStoreProducts } from '../../controllers/store/store-products.controller';
import { getStorePaymentConfig, createStorePaymentOrder, verifyStorePayment } from '../../controllers/store/store-payment.controller';
import { requireStoreAuth } from '../../middleware/store-auth.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
    UpdateProfileSchema,
    AddressSchema,
    AddressUpdateSchema,
    StoreWishlistAddSchema,
    CreateTransactionSchema
} from '../../schemas';

const router = Router();

// Public store routes (no auth required)
router.get('/products', getStoreProducts);

// Admin view of store customers
router.get('/customers', requireAuth, requirePermission('online-store', 'read'), getStoreCustomers);

// Store customer authenticated routes
router.get('/orders', requireStoreAuth, getOrders);
router.post('/orders', requireStoreAuth, validate(CreateTransactionSchema), createOrder);
router.get('/wishlist', requireStoreAuth, getWishlist);
router.post('/wishlist', requireStoreAuth, validate(StoreWishlistAddSchema), addToWishlist);
router.delete('/wishlist/:productId', requireStoreAuth, removeFromWishlist);
router.put('/profile', requireStoreAuth, validate(UpdateProfileSchema), updateProfile);
router.post('/addresses', requireStoreAuth, validate(AddressSchema), addAddress);
router.put('/addresses/:id', requireStoreAuth, validate(AddressUpdateSchema), updateAddress);
router.delete('/addresses/:id', requireStoreAuth, deleteAddress);

// Store payment routes
router.get('/payment/config', requireStoreAuth, getStorePaymentConfig);
router.post('/payment/create-order', requireStoreAuth, createStorePaymentOrder);
router.post('/payment/verify', requireStoreAuth, verifyStorePayment);

export default router;
