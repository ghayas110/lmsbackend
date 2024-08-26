const moment = require('moment');
const dbConnection = require('../db-connection'); 

exports.checkFeeStatus = async (req, res, next) => {
    try {
        const { id: studentId, user_type } = req.data;

        if (user_type === 'admin') {
            return next();
        }

        const [userResult] = await dbConnection.execute(
            `SELECT approved_by_admin_flag FROM users WHERE id = ?`,
            [studentId]
        );

        if (userResult.length > 0 && userResult[0].approved_by_admin_flag === 'Y') {
            return next();
        }

        const currentMonth = moment().format('MMMM');
        const currentYear = moment().format('YYYY');  

        const [feeResult] = await dbConnection.execute(
            `SELECT f.fee_status, u.is_fee_paid_flag
             FROM fees f
             JOIN users u ON f.student_id = u.id
             WHERE f.student_id = ? AND f.month = ? AND f.year = ? AND f.fee_status = 'Approved' AND u.is_fee_paid_flag = 'Y'`,
            [studentId, currentMonth, currentYear]
        );

        if (feeResult.length > 0) {
            return next();
        } else {
            return res.status(403).json({
                message: "Fee for the current month is not approved or paid. Please contact the administration."
            });
        }
    } catch (err) {
        return res.status(500).json({
            message: "An error occurred while checking fee status.",
            error: err.message
        });
    }
};
