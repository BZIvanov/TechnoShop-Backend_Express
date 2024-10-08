const httpStatus = require('http-status');

const Order = require('./order.model');
const Coupon = require('../coupon/coupon.model');
const Product = require('../product/product.model');
const catchAsync = require('../../middlewares/catch-async');
const AppError = require('../../utils/app-error');
const { userRoles } = require('../user/user.constants');

module.exports.getOrders = catchAsync(async (req, res) => {
  const { sortColumn = 'createdAt', order = 'desc', page, perPage } = req.query;

  const pageNumber = parseInt(page, 10) || 0;
  const perPageNumber = parseInt(perPage, 10) || 5;

  const builder = { orderedBy: req.user._id };
  if (req.user.role === userRoles.admin) {
    delete builder.orderedBy;
  }

  const orders = await Order.find(builder)
    .skip(pageNumber * perPageNumber)
    .limit(perPageNumber)
    .populate('coupon', 'name discount')
    .populate('orderedBy', '_id username')
    .populate('products.product', '_id title price')
    .sort([[sortColumn, order]])
    .exec();
  const totalCount = await Order.where(builder).countDocuments();

  res.status(httpStatus.OK).json({ success: true, orders, totalCount });
});

module.exports.createOrder = catchAsync(async (req, res, next) => {
  const currentUser = req.user;
  const { cart, address, coupon: couponName } = req.body;

  const orderData = {
    products: cart,
    deliveryAddress: address,
    coupon: undefined,
    orderedBy: currentUser._id,
    totalAmount: 0,
  };

  const coupon = await Coupon.findOne({ name: couponName });
  if (coupon) {
    const currentDateTime = new Date();
    const expirationDateTime = new Date(coupon.expirationDate);
    if (currentDateTime > expirationDateTime) {
      return next(
        new AppError(
          'This coupon has already expired.',
          httpStatus.BAD_REQUEST,
        ),
      );
    }

    orderData.coupon = coupon._id;
  }

  const products = await Product.find({
    _id: cart.map((cartItem) => cartItem.product),
  }).exec();

  const insufficientQuantityProduct = products.find((product) => {
    const currentCartProduct = cart.find(
      (cartProduct) => cartProduct.product === product._id.toString(),
    );

    return product.quantity < currentCartProduct.count;
  });

  if (insufficientQuantityProduct) {
    return next(
      new AppError('Insufficient product quantity', httpStatus.BAD_REQUEST),
    );
  }

  const totalAmount = products.reduce((acc, curr) => {
    const cartProduct = cart.find(
      (cartItem) => cartItem.product === curr._id.toString(),
    );
    return acc + curr.price * cartProduct.count;
  }, 0);
  orderData.totalAmount = coupon
    ? totalAmount - totalAmount * (coupon.discount / 100)
    : totalAmount;

  // update quantity and sold values for each product
  const bulkOption = cart.map((cartItem) => ({
    updateOne: {
      filter: { _id: cartItem.product },
      update: { $inc: { quantity: -cartItem.count, sold: +cartItem.count } },
    },
  }));
  await Product.bulkWrite(bulkOption, {});

  const order = await new Order(orderData).save();

  res.status(httpStatus.CREATED).json({ success: true, order });
});

module.exports.updateOrderStatus = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const { orderStatus } = req.body;

  const order = await Order.findByIdAndUpdate(
    orderId,
    { orderStatus },
    { new: true },
  )
    .populate('coupon', 'name discount')
    .populate('orderedBy', '_id username')
    .populate('products.product', '_id title price')
    .exec();

  res.status(httpStatus.OK).json({ success: true, order });
});
