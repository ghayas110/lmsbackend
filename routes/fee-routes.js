const router = require('express').Router();
const cors = require("cors");
const { verifyToken } = require('../middleware/auth-middleware');
const { XAPIKEYMIDDLEWARE } = require('../middleware/x-api-key-middleware');
const { isAdmin } = require('../middleware/isAdmin-middleware')
const stripe = require("stripe")("sk_test_51MFHJKIWbzOPJLuUg6l1q2z76djYhPcEisXvCjCrQmlsAidnHuwTvgEhjlj1hgo8Ydnfgwz9MX7SQPSBa1LKF8zl00QXOsHjrd")


const {insertFeeInvoice,updateFeeInvoice,deleteFeeInvoice,getAllFeeInvoicesByMonth,getAllFeeInvoices,getFeeInvoiceById,approveFeeInvoice,getAllFeeInvoicesByMonthName,getFeeDataForAug2024ToMay2025} = require('../controllers/pay-fee-controller')

router.post('/fees/insert-fee-invoice', verifyToken, XAPIKEYMIDDLEWARE, insertFeeInvoice)

router.post('/fees/update-fee-invoice', verifyToken, XAPIKEYMIDDLEWARE, updateFeeInvoice)

router.post('/fees/delete-fee-invoice', verifyToken, XAPIKEYMIDDLEWARE, deleteFeeInvoice)

router.get('/fees/get-all-fee-invoices-by-month', verifyToken,isAdmin, XAPIKEYMIDDLEWARE, getAllFeeInvoicesByMonth)

router.get('/fees/get-all-fee-invoices-by-month-name', verifyToken,isAdmin, XAPIKEYMIDDLEWARE, getAllFeeInvoicesByMonthName)

router.get('/fees/get-all-fee-invoices', verifyToken, XAPIKEYMIDDLEWARE, getAllFeeInvoices)

router.get('/fees/get-all-fee-august-to-may', verifyToken, XAPIKEYMIDDLEWARE, getFeeDataForAug2024ToMay2025)

router.get('/fees/get-fee-invoice-by-Id/:fee_id', verifyToken,isAdmin, XAPIKEYMIDDLEWARE, getFeeInvoiceById)

router.post('/fees/approve-fee-invoice', verifyToken,isAdmin, XAPIKEYMIDDLEWARE, approveFeeInvoice)

router.post('/checkout', async(req, res) => {
    console.log(req.body)
    let error, status
    try {
        const { product, token } = req.body

        const customer = await stripe.customers.create({
            email: token.email,
            source: token.id
        })
        const charge = await stripe.charges.create({
            amount: product.price * 100,
            currency: "usd",
            customer: customer.id,
            receipt_email: token.email,
            description: product.name
        })
        console.log("charges", charge)
        status = "success"
    } catch (error) {
        console.log(error)
        status = "failure"
    }
    res.json({ error, status })
})


module.exports = router;