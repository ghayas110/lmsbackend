const dbConnection = require('../db-connection');
const path = require('path');
const fs = require('fs')
const { promisify } = require('util')
const unlinkAsync = promisify(fs.unlink)
const dotenv = require('dotenv');
const multer = require("multer");
const moment = require('moment');
const cron = require('node-cron');
const uploadFeeInvoice = require('../middleware/pay-fee-middleware');


exports.insertFeeInvoice = async (req, res) => {
    try {
        await uploadFeeInvoice(req, res);
        const student_id = req.data.id;

        const { month, year } = req.body;
        const invoiceFile = req.file ? `/resources/static/assets/uploads/fee-Invoices/${req.file.filename}` : null;

        if (!month || !year) {
            removeUploadedInvoiceFile(req.file.path);
            return res.status(400).json({
                message: "Missing required fields"
            });
        }

        const fee_expiry_date = moment().add(30, 'days').format('YYYY-MM-DD');

        const [existingFees] = await dbConnection.execute(
            `SELECT * FROM fees WHERE student_id = ? AND month = ? AND year = ?`, [student_id, month, year]
        );
        if (existingFees.length > 0) {
            removeUploadedInvoiceFile(req.file.path);
            return res.status(400).json({
                message: "Invoice already uploaded"
            });
        }

        const [result] = await dbConnection.execute(
            `INSERT INTO fees (student_id, month, year, invoice_file, fee_status, fee_expiry_date) 
             VALUES (?, ?, ?, ?, 'Pending', ?)`,
            [student_id, month, year, invoiceFile, '']
        );

        if (result.affectedRows === 1) {
            return res.status(201).json({
                message: "Fee invoice uploaded successfully"
            });
        } else {
            removeUploadedInvoiceFile(req.file.path);
            return res.status(500).json({
                message: "Could not create fee record"
            });
        }
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};

function removeUploadedInvoiceFile(file) {
    if (file) {
        const filePath = path.join(__dirname, '..', file);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}

exports.updateFeeInvoice = async (req, res) => {
    try {
        await uploadFeeInvoice(req, res);

        const { fee_id, month, year } = req.body;
        const student_id = req.data.id;

        if (!fee_id) {
            removeUploadedInvoiceFile(req.file.path);
            return res.status(400).json({
                message: "Fee ID is required"
            });
        }

        const [existingFee] = await dbConnection.execute(
            "SELECT * FROM fees WHERE fee_id = ? AND student_id = ?",
            [fee_id, student_id]
        );

        if (existingFee.length === 0) {
            removeUploadedInvoiceFile(req.file.path);
            return res.status(404).json({
                message: "Record not found"
            });
        }

        const oldInvoiceFile = existingFee[0].invoice_file;

        if (req.file) {
            const oldAttachmentPath = path.join(__dirname, '..', oldInvoiceFile);
            try {
                if (oldInvoiceFile) {
                    fs.unlinkSync(oldAttachmentPath);
                }
            } catch (error) {
                console.error("File not found or could not be removed:", error);
            }

            var invoice_file = `/resources/static/assets/uploads/fee-Invoices/${req.file.filename}`;
        } else {
            var invoice_file = oldInvoiceFile;
        }

        const [updateFeeInvoice] = await dbConnection.execute(
            "UPDATE fees SET month = ?, year = ?, invoice_file = ?, updated_at = CURRENT_TIMESTAMP WHERE fee_id = ?",
            [month || existingFee[0].month, year || existingFee[0].year, invoice_file, fee_id]
        );

        if (updateFeeInvoice.affectedRows === 1) {
            return res.status(200).json({
                message: "Fee Invoice updated successfully"
            });
        } else {
            removeUploadedInvoiceFile(req.file.path);
            return res.status(500).json({
                message: "Could not update fee"
            });
        }

    } catch (err) {
        console.log("Error:", err.message);
        removeUploadedInvoiceFile(req.file.path);
        return res.status(500).json({
            message: err.message
        });
    }
};

exports.deleteFeeInvoice = async (req, res) => {
    try {
        const { fee_id } = req.body;

        if (!fee_id) {
            return res.status(400).json({
                message: "Fee Id is required"
            });
        }

        const [existingFee] = await dbConnection.execute(
            "SELECT * FROM fees WHERE fee_id = ? ",
            [fee_id]
        );

        if (existingFee.length === 0) {
            return res.status(404).json({
                message: "Record not found"
            });
        }

        const invoiceFile = existingFee[0].invoice_file;

        const [deleteResult] = await dbConnection.execute(
            "DELETE FROM fees WHERE fee_id = ? ",
            [fee_id]
        );

        if (deleteResult.affectedRows === 1) {
            if (invoiceFile) {
                const invoiceFilePath = path.join(__dirname, '..', invoiceFile);
                try {
                    if (fs.existsSync(invoiceFilePath)) {
                        fs.unlinkSync(invoiceFilePath);
                    }
                } catch (error) {
                    console.error("Error removing file:", error);
                }
            }

            return res.status(200).json({
                message: "Fee Invoice deleted successfully"
            });
        } else {
            return res.status(500).json({
                message: "Could not delete fee"
            });
        }
    } catch (err) {
        console.log("Error:", err.message);
        return res.status(500).json({
            message: err.message
        });
    }
};

exports.getAllFeeInvoicesByMonth = async (req, res) => {
    try {
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const currentMonth = new Date().getMonth();
        const currentMonthName = monthNames[currentMonth];
        const currentYear = new Date().getFullYear();

        const [getAllFeeInvoicesByMonth] = await dbConnection.execute(`
            SELECT 
                u.id AS student_id,
                u.name,
                u.contact,
                u.selected_course,
                COALESCE(f.fee_id, '') AS fee_id,
                COALESCE(f.month, ?) AS month,
                COALESCE(f.year, ?) AS year,
                COALESCE(f.invoice_file, '') AS invoice_file,
                COALESCE(f.fee_status, 'Not Paid') AS fee_status,
                COALESCE(f.fee_expiry_date, '') AS fee_expiry_date,
                COALESCE(f.approved_by, '') AS approved_by,
                COALESCE(f.created_at, '') AS created_at,
                COALESCE(f.updated_at, '') AS updated_at
            FROM 
                users u
            LEFT JOIN 
                fees f 
            ON 
                u.id = f.student_id 
                AND f.month = ? 
                AND f.year = ?
                where 
                u.user_type != 'admin'
        `, [currentMonthName, currentYear, currentMonthName, currentYear]);

        return res.status(200).json({
            message: "Fee invoices retrieved successfully",
            data: getAllFeeInvoicesByMonth
        });
    } catch (err) {
        res.status(500).send({
            message: err.message
        });
    }
};



exports.getAllFeeInvoicesByMonthName = async (req, res) => {
    try {
        // Get the month and year from the request query parameters
        const { month, year } = req.query;

        // Define the month names
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        // Convert month number to month name
        const monthName = monthNames[parseInt(month, 10) - 1];

        if (!monthName || !year) {
            return res.status(400).json({ message: "Month and year are required" });
        }

        const [getAllFeeInvoicesByMonth] = await dbConnection.execute(`
            SELECT 
                u.id AS student_id,
                u.name,
                u.contact,
                u.selected_course,
                COALESCE(f.fee_id, '') AS fee_id,
                COALESCE(f.month, ?) AS month,
                COALESCE(f.year, ?) AS year,
                COALESCE(f.invoice_file, '') AS invoice_file,
                COALESCE(f.fee_status, 'Not Paid') AS fee_status,
                COALESCE(f.fee_expiry_date, '') AS fee_expiry_date,
                COALESCE(f.approved_by, '') AS approved_by,
                COALESCE(f.created_at, '') AS created_at,
                COALESCE(f.updated_at, '') AS updated_at
            FROM 
                users u
            LEFT JOIN 
                fees f 
            ON 
                u.id = f.student_id 
                AND f.month = ? 
                AND f.year = ?
            WHERE 
                u.user_type != 'admin'
        `, [monthName, year, monthName, year]);

        return res.status(200).json({
            message: "Fee invoices retrieved successfully",
            data: getAllFeeInvoicesByMonth
        });
    } catch (err) {
        return res.status(500).send({
            message: err.message
        });
    }
};



exports.getAllFeeInvoices = async (req, res) => {
    try {
        const { id: userId, user_type } = req.data;

        let query = '';
        let params = [];

        if (user_type === 'admin') {
            query = `
                SELECT 
                    f.fee_id,
                    u.name AS student_name,
                    u.contact AS contact,
                    u.selected_course,
                    f.month,
                    f.year,
                    f.invoice_file,
                    f.fee_status,
                    f.fee_expiry_date,
                    f.approved_by,
                    f.created_at,
                    f.updated_at
                FROM 
                    fees f
                JOIN 
                    users u 
                ON 
                    f.student_id = u.id
                WHERE 
                    u.user_type != 'admin'
            `;
        } else {
            query = `
                SELECT 
                    f.fee_id,
                    u.name AS student_name,
                    u.contact AS contact,
                    u.selected_course,
                    f.month,
                    f.year,
                    f.invoice_file,
                    f.fee_status,
                    f.fee_expiry_date,
                    f.approved_by,
                    f.created_at,
                    f.updated_at
                FROM 
                    fees f
                JOIN 
                    users u 
                ON 
                    f.student_id = u.id
                WHERE 
                    f.student_id = ? AND u.user_type = 'student'
            `;
            params.push(userId);
        }

        const [getAllFeeInvoices] = await dbConnection.execute(query, params);

        return res.status(200).json({
            message: "Fee invoices retrieved successfully",
            data: getAllFeeInvoices
        });
    } catch (err) {
        return res.status(500).json({
            error: err.message
        });
    }
};

exports.getFeeInvoiceById = async (req, res) => {
    try {
        const { fee_id } = req.params;
        const [getFeeInvoiceById] = await dbConnection.execute(`select f.fee_id ,u.name ,u.contact,u.selected_course,f.month ,f.year,f.invoice_file ,f.fee_status ,f.fee_expiry_date,
            f.approved_by, f.created_at, f.updated_at  from fees f join users u on f.student_id = u.id where fee_id=?`, [fee_id]);

        return res.status(200).json({
            message: "fee invoice retrieved successfully",
            data: getFeeInvoiceById[0]
        });
    } catch (err) {
        res.status(500).send({
            message: err.message
        });
    }
};

exports.approveFeeInvoice = async (req, res) => {
    try {
        const { fee_id, fee_status } = req.body;
        const admin_id = req.data.id;

        if (!fee_id || !fee_status) {
            return res.status(400).json({
                message: "Fee ID and fee status are required"
            });
        }

        const [existingFee] = await dbConnection.execute(
            "SELECT * FROM fees WHERE fee_id = ?",
            [fee_id]
        );

        if (existingFee.length === 0) {
            return res.status(404).json({
                message: "Record not found"
            });
        }

        const student_id = existingFee[0].student_id;

        const [updateFeeStatus] = await dbConnection.execute(
            "UPDATE fees SET fee_status = ?, approved_by = ? WHERE fee_id = ?",
            [fee_status, admin_id, fee_id]
        );

        if (updateFeeStatus.affectedRows === 1) {
            if (fee_status === 'Approved') {
                await dbConnection.execute(
                    "UPDATE users SET is_fee_paid_flag = 'Y' WHERE id = ?",
                    [student_id]
                );
            }

            return res.status(200).json({
                message: "Fee approved successfully"
            });
        } else {
            return res.status(500).json({
                message: "Could not update fee status"
            });
        }

    } catch (err) {
        console.log("Error:", err.message);
        return res.status(500).json({
            message: err.message
        });
    }
};

cron.schedule('0 0 * * *', async () => {
    try {
        const thirtyDaysAgo = moment().subtract(30, 'days').format('YYYY-MM-DD');

        const [fees] = await dbConnection.execute(
            "SELECT student_id FROM fees WHERE fee_status = 'Approved' AND DATE(fee_expiry_date) = ?",
            [thirtyDaysAgo]
        );

        if (fees.length > 0) {
            const studentIds = fees.map(fee => fee.student_id);
            await dbConnection.execute(
                "UPDATE users SET is_fee_paid_flag = 'N' WHERE id IN (?)",
                [studentIds]
            );
        }
    } catch (err) {
        console.error("Error in scheduled task:", err.message);
    }
});

exports.getFeeDataForAug2024ToMay2025 = async (req, res) => {
    try {
        const studentId = req.data.id;

        const months = [
            { month: 'August', year: 2024 },
            { month: 'September', year: 2024 },
            { month: 'October', year: 2024 },
            { month: 'November', year: 2024 },
            { month: 'December', year: 2024 },
            { month: 'January', year: 2025 },
            { month: 'February', year: 2025 },
            { month: 'March', year: 2025 },
            { month: 'April', year: 2025 },
            { month: 'May', year: 2025 }
        ];

        // Generate the WHERE clause for the query
        const conditions = months.map(({ month, year }) => `(f.month = '${month}' AND f.year = ${year})`).join(' OR ');

        const [feeData] = await dbConnection.execute(`
            SELECT 
                f.fee_id,
                f.month,
                f.year,
                f.invoice_file,
                f.fee_status,
                f.fee_expiry_date,
                f.approved_by,
                f.created_at,
                f.updated_at
            FROM 
                fees f
            WHERE 
                f.student_id = ? 
                AND (${conditions})
        `, [studentId]);

        const feeDataMap = feeData.reduce((acc, fee) => {
            acc[`${fee.month}-${fee.year}`] = fee;
            return acc;
        }, {});

        const result = months.map(({ month, year }) => {
            return feeDataMap[`${month}-${year}`] || {
                fee_id: null,
                month,
                year,
                invoice_file: null,
                fee_status: "Pending",
                fee_expiry_date: null,
                approved_by: null,
                created_at: null,
                updated_at: null
            };
        });

        return res.status(200).json({
            message: "Fee data retrieved successfully",
            data: result
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};