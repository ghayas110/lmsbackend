const util = require("util");
const multer = require("multer");
const fs = require("fs").promises;

let storageposts = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./resources/static/assets/uploads/fee-Invoices/");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now().toString().slice(0, -3)}-${file.originalname}`);
    },
});
let uploadFeeInvoice = multer({
    storage: storageposts,
}).single("invoice");
let uploadFeeInvoiceMiddleware = util.promisify(uploadFeeInvoice);
module.exports = uploadFeeInvoiceMiddleware;
