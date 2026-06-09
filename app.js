require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const cron = require("node-cron");
const HospitalSubscription = require("./model/HospitalSubscriptionModel");
const HospitalPlan = require("./model/HospitalPlanModel");

connectDB()
const app = express();
app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173"
}));
app.use("/uploads", express.static("uploads"));



// Runs every day at midnight
cron.schedule("0 0 * * *", async () => {
  try {
    const expired = await HospitalSubscription.find({
      status: "ACTIVE",
      expiry_date: { $lt: new Date() }
    });

    for (const sub of expired) {
      // Mark subscription as EXPIRED
      await HospitalSubscription.findByIdAndUpdate(sub._id, { status: "EXPIRED" });

      // Also mark HospitalPlan as INACTIVE
      await HospitalPlan.updateMany(
        { hospital_id: sub.hospital_id, status: "ACTIVE" },
        { $set: { status: "INACTIVE" } }
      );
    }

    console.log(`[CRON] Expired ${expired.length} subscriptions`);
  } catch (err) {
    console.error("[CRON] Error expiring subscriptions:", err.message);
  }
});


// Define routes
const userRouter = require('./router/UserRouter')
const adminRouter = require('./router/AdminRouter');
const hospitalRouter = require("./router/HospitalRouter");
const guestRouter = require('./router/GuestRouter');
const hospitalRequestRouter = require('./router/AdminRouter');
const staffRouter = require('./router/StaffRouter');
const planRouter = require('./router/PlanRouter');
const paymentRouter = require('./router/PaymentRouter');


app.use('/api', userRouter)
app.use('/userapi', userRouter)
app.use('/adminapi', adminRouter);
app.use('/hospitalapi', hospitalRouter);
app.use('/guestapi', guestRouter);
app.use('/hospitalrequestapi', hospitalRequestRouter);
app.use('/staffapi', staffRouter);
app.use('/planapi', planRouter);
app.use('/paymentapi', paymentRouter);



const port = process.env.PORT
app.listen(port, () => {
  console.log(`Backend is running on port ${port}`);
});     
