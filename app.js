var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var customerRouter = require('./routes/customer');
var categoryRouter = require('./routes/category');
var cartRouter = require('./routes/cart');
var offerRouter = require('./routes/offer');
var orderRouter = require('./routes/order');
var brandRouter = require('./routes/brand');
var productRouter = require('./routes/product');
var shopRouter = require('./routes/shop');
var slotRouter = require('./routes/slot');
var companyRouter = require('./routes/company');
var adminRouter = require('./routes/admin');
var scanRouter = require('./routes/scan')
var systemConfigRouter = require('./routes/systemConfig')
// var razorpayRouter = require('./routes/razorpay')
var noteRouter = require('./routes/note')
var queryRouter = require('./routes/query')
var redeemRouter = require('./routes/redeemReq')
var faqRouter = require('./routes/faq')
var broadcastRouter = require('./routes/broadcasts')
var dashboardRouter = require('./routes/dashboard')
const cron = require("node-cron");
const { sendScheduledBroadcasts } = require("./cron/broadcastCron");
const { runSettlementSummaryTick } = require("./cron/settlementSummaryCron");


require('dotenv').config()

var app = express();
const cors = require('cors');
// const { updateUrlInDb, updateDescInDB, deleteProdFromDB } = require('./lib/helper');
app.use(cors());

mongoose.set('debug', true);
mongoose.Promise = global.Promise;
mongoose.connect(process.env.db, { useNewUrlParser: true });
console.log("Database Connected Successfully");

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json({ limit: '500mb', extended: true }));
app.use(express.urlencoded({ limit:'100mb',extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/customer', customerRouter);
app.use('/cart', cartRouter);
app.use('/category', categoryRouter);
app.use('/offer', offerRouter);
app.use('/order', orderRouter);
app.use('/product', productRouter);
app.use('/shop', shopRouter);
app.use('/brand', brandRouter);
app.use('/dashboard', dashboardRouter);

app.use('/slot', slotRouter);
app.use('/company', companyRouter);
app.use('/admin', adminRouter);
app.use('/scans', scanRouter);  
app.use('/system_config', systemConfigRouter);
// app.use('/razorpay', razorpayRouter);
app.use('/note', noteRouter);
app.use('/query', queryRouter);
app.use('/redeem', redeemRouter);
app.use('/faq', faqRouter);
app.use('/broadcast', broadcastRouter);


// Broadcast Cron

cron.schedule(
  "30 12 * * *",
  async () => {
    console.log("Running 12:30 PM IST broadcast cron");
    await sendScheduledBroadcasts("12:30 PM");
  },
  {
    timezone: "Asia/Kolkata",
  }
);

cron.schedule(
  "30 18 * * *",
  async () => {
    console.log("Running 6:30 PM IST broadcast cron");
    await sendScheduledBroadcasts("06:30 PM");
  },
  {
    timezone: "Asia/Kolkata",
  }
);

// Daily per-shop settlement summary. summary_time is restricted to half-hour
// slots, so the tick runs at :00 and :30 IST only.
cron.schedule(
  "0,30 * * * *",
  async () => {
    await runSettlementSummaryTick();
  },
  {
    timezone: "Asia/Kolkata",
  }
);



// updateUrlInDb()
// updateDescInDB()
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
