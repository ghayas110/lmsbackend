const dbConnection = require('../db-connection');
const bcrypt = require('bcryptjs');
const uploadProfile = require('../middleware/profile-upload-middleware')
const emailValidator = require('../globals/email-validator');
const { generateToken } = require('../globals/token-validation');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;
const moment = require('moment');


exports.signUp = async (req, res) => {
    try {
        await uploadProfile(req, res);
        const { name, email, password, selected_course,contact } = req.body;

        if (!emailValidator(email)) {
            removeUploadedProfile(req.file.path);
            return res.status(400).send({
                messaage: "Invalid Email Format"
            });
        }

        const [checkEmailUnique] = await dbConnection.execute(`SELECT * FROM users WHERE email = ?`, [email]);
        if (checkEmailUnique.length > 0) {
            removeUploadedProfile(req.file.path);
            return res.status(400).send({
                message: "Email already registered"
            });
        }

        const hashPass = await bcrypt.hash(password, 12);
        let profilePictureUrl = "";
        if (req.file) {
            profilePictureUrl = '/resources/static/assets/uploads/profiles/' + req.file.filename;
        }
        const signUpParams = [name, email, hashPass, selected_course, profilePictureUrl,contact];

        if (selected_course !== 'OS' && selected_course !== 'AS' && selected_course !== 'Both') {
            removeUploadedProfile(req.file.path);
            return res.status(400).send({
                message: "Please choose a correct course"
            });
        }

        const [signUp] = await dbConnection.execute(`INSERT INTO users (name, email, password, selected_course,profile_picture_url,contact) VALUES (?, ?, ?, ?,?,?)`, signUpParams);

        if (signUp.affectedRows === 1) {
            return res.status(200).send({
                message: "User added successfully"
            });
        } else {
            removeUploadedProfile(req.file.path);
            return res.status(500).json({
                message: "Could not add user"
            });
        }
    } catch (err) {
        res.status(500).send({
            message: `${err}`,
        });
    }
};

function removeUploadedProfile(file) {
    if (file) {
        const filePath = path.join(__dirname, '..', file);
        if (fs.access(filePath)) {
            fs.unlink(filePath);
        }
    }
}

exports.updateUserProfile = async (req, res) => {
    try {
        await uploadProfile(req, res);
        const { id, name, email, selected_course,contact } = req.body;

        if (!emailValidator(email)) {
            if (req.file) removeUploadedProfile(req.file.path);
            return res.status(400).send({
                message: "Invalid Email Format"
            });
        }

        const [user] = await dbConnection.execute(`SELECT * FROM users WHERE id = ?`, [id]);
        if (user.length === 0) {
            if (req.file) removeUploadedProfile(req.file.path);
            return res.status(404).send({
                message: "User not found"
            });
        }

        const [checkEmailUnique] = await dbConnection.execute(`SELECT * FROM users WHERE email = ? AND id != ?`, [email, id]);
        if (checkEmailUnique.length > 0) {
            if (req.file) removeUploadedProfile(req.file.path);
            return res.status(400).send({
                message: "Email already registered by another user"
            });
        }

        let profilePictureUrl = user[0].profile_picture_url; 
        if (req.file) {
            profilePictureUrl = '/resources/static/assets/uploads/profiles/' + req.file.filename;

            if (user[0].profile_picture_url) {
                const oldProfilePicturePath = path.join(__dirname, '..', user[0].profile_picture_url);
                try {
                    await fs.unlink(oldProfilePicturePath);
                } catch (error) {
                    console.error(`Failed to delete old profile picture: ${error.message}`);
                }
            }
        }

        if (selected_course && selected_course !== 'OS' && selected_course !== 'AS' && selected_course !== 'Both') {
            if (req.file) removeUploadedProfile(req.file.path);
            return res.status(400).send({
                message: "Please choose a correct course"
            });
        }

        const updateParams = [name,contact, email, selected_course || user[0].selected_course, profilePictureUrl, id];
        const [updateUser] = await dbConnection.execute(`UPDATE users SET name = ?,contact=?, email = ?, selected_course = ?, profile_picture_url = ? WHERE id = ?`, updateParams);

        if (updateUser.affectedRows === 1) {
            return res.status(200).send({
                message: "User profile updated successfully"
            });
        } else {
            if (req.file) removeUploadedProfile(req.file.path);
            return res.status(500).json({
                message: "Could not update user profile"
            });
        }
    } catch (err) {
        res.status(500).send({
            message: `${err}`,
        });
    }
};

exports.loginUser = async (req, res) => {
    var { email, password } = req.body;
    try {
        if (!emailValidator(req.body.email)) {
            return res.status(400).send({
                data: "Invalid Email Format"
            });
        }
        const [user] = await dbConnection.execute(`SELECT * FROM users WHERE email = ?`, [email]);
        if (user.length === 0) {
            return res.status(400).send({
                data: "Invalid email or password"
            });
        }
        const userData = user[0];
        const isPasswordValid = await bcrypt.compare(password, userData.password);
        if (!isPasswordValid) {
            return res.status(400).send({
                data: "Invalid email or password"
            });
        }

        const tokenResponse = await generateToken([userData]);

        const dataa = {
            id: tokenResponse.user_data[0].id,
            user_type: tokenResponse.user_data[0].user_type,
            name: tokenResponse.user_data[0].name,
            contact: tokenResponse.user_data[0].contact,
            email: tokenResponse.user_data[0].email,
            selected_course: tokenResponse.user_data[0].selected_course,
            image: tokenResponse.user_data[0].profile_picture_url,
            approved_by_admin_flag : tokenResponse.user_data[0].approved_by_admin_flag,
            is_fee_paid_flag : tokenResponse.user_data[0].is_fee_paid_flag
        }
        return res.status(200).send({
            message: tokenResponse.data,
            access_token: tokenResponse.access_token,
            refresh_token: tokenResponse.refresh_token,
            data: dataa
        });
    } catch (err) {
        return res.status(500).send({
            message: "Failed",
            error: err.message
        });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const [getAllUsers] = await dbConnection.execute(`select id,user_type,name,contact,email,selected_course,profile_picture_url,approved_by_admin_flag,is_fee_paid_flag,created_at,updated_at FROM users`);
        return res.status(200).json({
            message: "Users retrieved successfully",
            data: getAllUsers
        });
    } catch (err) {
        res.status(500).send({
            message: err.message
        });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const [getUserById] = await dbConnection.execute(`select id,user_type,name,contact,email,selected_course,profile_picture_url,approved_by_admin_flag,is_fee_paid_flag,created_at,updated_at FROM users where id=?`, [id]);

        return res.status(200).json({
            message: "User retrieved successfully",
            data: getUserById
        });
    } catch (err) {
        res.status(500).send({
            message: err.message
        });
    }
};

exports.approveStudentAccess = async (req, res) => {
    try {
        const { id } = req.body;
        
        if (req.data.user_type !== 'admin') {
            return res.status(403).json({
                message: "Only admins can approve student access."
            });
        }
        if (!id) {
            return res.status(400).json({
                message: "Student Id is required"
            });
        }

        const [updateStudentAccess] = await dbConnection.execute(
            "UPDATE users SET approved_by_admin_flag = 'Y' WHERE id = ?",
            [id]
        );

        if (updateStudentAccess.affectedRows === 1) {
            return res.status(200).json({
                message: "Student approved successfully"
            });
        } else {
            return res.status(404).json({
                message: "Student not found or already approved"
            });
        }

    } catch (err) {
        console.error(err.message);
        return res.status(500).json({
            message: "An error occurred"
        });
    }
};

exports.rejectStudentAccess = async (req, res) => {
    try {
        const { id } = req.body;

        if (req.data.user_type !== 'admin') {
            return res.status(403).json({
                message: "Only admins can reject student access."
            });
        }
            
        if (!id || isNaN(id)) {
            return res.status(400).json({
                message: "A valid Student ID is required."
            });
        }
                const [studentCheck] = await dbConnection.execute(
            "SELECT approved_by_admin_flag FROM users WHERE id = ?",
            [id]
        );

        if (studentCheck.length === 0) {
            return res.status(404).json({
                message: "Student not found."
            });
        }

        const { approved_by_admin_flag } = studentCheck[0];
        if (approved_by_admin_flag === 'N') {
            return res.status(400).json({
                message: "Student access is already rejected."
            });
        }

        const [updateStudentAccess] = await dbConnection.execute(
            "UPDATE users SET approved_by_admin_flag = 'N' WHERE id = ?",
            [id]
        );

        if (updateStudentAccess.affectedRows === 1) {
            return res.status(200).json({
                message: "Student access rejected successfully."
            });
        } else {
            return res.status(500).json({
                message: "Failed."
            });
        }

    } catch (err) {
        console.error("Error in rejectStudentAccess:", err.message);
        return res.status(500).json({
            message: err?.message
        });
    }
};

exports.getDashboardCounts = async (req, res) => {
    try {
        const currentMonth = moment().format('MMMM');
        const currentYear = moment().format('YYYY');
        
        const [studentsCount] = await dbConnection.execute(`
            SELECT COUNT(*) AS total_students FROM users WHERE user_type = 'student'
        `);
        const [paidStudentsCount] = await dbConnection.execute(`
            SELECT COUNT(DISTINCT student_id) AS total_paid_students 
            FROM fees 
            WHERE month = ? AND year = ? 
        `, [currentMonth, currentYear]);

        const [unpaidStudentsCount] = await dbConnection.execute(`
            SELECT COUNT(DISTINCT u.id) AS total_unpaid_students 
            FROM users u
            LEFT JOIN fees f ON u.id = f.student_id AND f.month = ? AND f.year = ?
            WHERE u.user_type = 'student' AND u.approved_by_admin_flag = 'N'
            AND (f.fee_status IS NULL )
        `, [currentMonth, currentYear]);

        return res.status(200).json({
            total_students: studentsCount[0].total_students,
            total_courses: 3,
            total_paid_students: paidStudentsCount[0].total_paid_students,
            total_unpaid_students: unpaidStudentsCount[0].total_unpaid_students
        });

    } catch (err) {
        console.error(err.message);
        return res.status(500).json({
            message: "An error occurred while fetching dashboard counts.",
            error: err.message
        });
    }
};

exports.changePassword = async (req, res) => {
    try {
        if (req.data.user_type !== 'admin') {
            return res.status(403).json({
                message: "Forbidden: Only admins can change passwords"
            });
        }

        const { id, new_password } = req.body;

        if (!id || !new_password) {
            return res.status(400).json({
                message: "Student ID and new password are required"
            });
        }

        const hashedPassword = await bcrypt.hash(new_password, 12);

        const [updateResult] = await dbConnection.execute(
            "UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [hashedPassword, id]
        );

        if (updateResult.affectedRows === 1) {
            return res.status(200).json({
                message: "Password updated successfully"
            });
        } else {
            return res.status(404).json({
                message: "Student not found"
            });
        }
    } catch (err) {
        console.error("Error:", err.message);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

const transporter = nodemailer.createTransport({
    host: 'webmail.papersdock.com',
    port: 587,
    secure: false,
    auth: {
        user: 'lms@papersdock.com',
        pass: 'BKK$PGPCCDv='
    }
});

cron.schedule('0 0 * * *', async () => {
    try {
        const [students] = await dbConnection.execute(`
            SELECT u.email, u.name, f.fee_expiry_date, f.month, f.year 
            FROM fees f
            JOIN users u ON f.student_id = u.id
            WHERE f.fee_expiry_date = CURDATE()
        `);

        if (students.length > 0) {
            students.forEach(student => {
                const mailOptions = {
                    from: 'lms@papersdock.com',
                    to: student.email,
                    subject: 'Fee Expiry Reminder',
                    text: `Dear ${student.name},

                We hope you are doing well. This is a gentle reminder that your fee for the month (${student.month} ${student.year}) will expire tomorrow.
                Please make sure to pay the fee for the next month as soon as possible to avoid any disruption in your access to the services.

                Thank you for your prompt attention to this matter.

                Best regards,
                Paper Docs Management`
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log(`Error sending email to ${student.email}:`, error);
                    } else {
                        console.log(`Email sent to ${student.email}:`, info.response);
                    }
                });
            });
        } else {
            console.log('No fees expiring today.');
        }
    } catch (err) {
        console.error('Error running cron job:', err);
    }
});