const cron = require('node-cron');
const dbConnection = require('../db-connection');
const  uploadAssignments  = require('../middleware/assignment-upload-middleware');
const path = require('path');
const { promisify } = require('util')
const fs = require('fs').promises;
const unlinkAsync = promisify(fs.unlink)
const multer = require("multer");


exports.createAssignment = async (req, res) => {
    try {
        await uploadAssignments(req, res);
        const { title, description, course_type, deadline } = req.body;

        if (!title || !course_type || !deadline) {
            if (req.file) removeUploadedFile(req.file.path);
            return res.status(400).json({
                message: "Title, course type, and deadline are required fields"
            });
        }

        
        let assignmentFile = "";
        if (req.file && req.file.originalname) {
            assignmentFile = `/resources/static/assets/uploads/assignmentUpload/${Date.now().toString().slice(0, -3)}-${req.file.originalname}`;
        }

        const [createAssignment] = await dbConnection.execute(
            "INSERT INTO assignments (title, description, assignment_file, deadline, course_type, status) VALUES (?, ?, ?, ?, ?, 'Assigned')",
            [title, description, assignmentFile, deadline, course_type]
        );

        if (createAssignment.affectedRows === 1) {
            const assignmentId = createAssignment.insertId;
            scheduleStatusUpdate(assignmentId, deadline);

            return res.status(200).json({
                message: "Assignment created successfully"
            });
        } else {
            if (req.file) removeUploadedFile(req.file.path);
            return res.status(500).json({
                message: "Could not create assignment"
            });
        }
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};

function scheduleStatusUpdate(assignmentId, deadline) {
    const deadlineDate = new Date(deadline);
    const job = cron.schedule(
        `${deadlineDate.getMinutes()} ${deadlineDate.getHours()} ${deadlineDate.getDate()} ${deadlineDate.getMonth() + 1} *`,
        async () => {
            await dbConnection.execute(
                "UPDATE assignments SET status = 'Time Exceeded' WHERE assignment_id = ?",
                [assignmentId]
            );
            job.stop();
        }
    );
}

function removeUploadedFile(file) {
    if (file) {
        const filePath = path.join(__dirname, '..', file);
        if (fs.access(filePath)) {
            fs.unlink(filePath);
        }
    }
}

exports.updateAssignment = async (req, res) => {
    try {
        uploadAssignments(req, res, async (err) => {
            if (err) {
                return res.status(500).send({
                    message: "Failed",
                    data: `${err.message}`,
                });
            }

            const { assignment_id, title, description, deadline, course_type } = req.body;

            const [checkExistence] = await dbConnection.execute(`SELECT * FROM assignments WHERE assignment_id = ?`, [assignment_id]);
            if (checkExistence.length < 1) {
                if (req.file) removeUploadedFile(req.file.path);
                return res.status(400).json({ message: "Assignment does not exist" });
            }

            const [oldAttachmentResult] = await dbConnection.execute(`SELECT assignment_file FROM assignments WHERE assignment_id = ?`, [assignment_id]);

            let assignmentFile = oldAttachmentResult[0].assignment_file; 

            if (req.file && req.file.originalname) {
                assignmentFile = `/resources/static/assets/uploads/assignmentUpload/${Date.now().toString().slice(0, -3)}-${req.file.originalname}`;

                if (oldAttachmentResult[0].assignment_file && oldAttachmentResult[0].assignment_file !== "") {
                    const oldAttachmentPath = path.join(__dirname, '..', oldAttachmentResult[0].assignment_file);
                    if (fs.access(oldAttachmentPath)) {
                        fs.unlink(oldAttachmentPath);
                    }
                }
            }

            const updateAssignmentQuery = `UPDATE assignments SET title = ?, description = ?, deadline = ?, course_type = ?, assignment_file = ? WHERE assignment_id = ?`;

            const [updateAssignment] = await dbConnection.execute(updateAssignmentQuery, [title, description, deadline, course_type, assignmentFile, assignment_id]);

            if (updateAssignment.affectedRows === 1) {
                scheduleStatusUpdated(assignment_id, deadline);
                return res.status(200).send({
                    message: "Assignment updated successfully"
                });
            } else {
                return res.status(500).json({
                    message: "Could not update assignment"
                });
            }
        });
    } catch (err) {
        res.status(500).send({
            message: err.message
        });
    }
};

function scheduleStatusUpdated(assignmentId, deadline) {
    const deadlineDate = new Date(deadline);
    const job = cron.schedule(
        `${deadlineDate.getMinutes()} ${deadlineDate.getHours()} ${deadlineDate.getDate()} ${deadlineDate.getMonth() + 1} *`,
        async () => {
            await dbConnection.execute(
                "UPDATE assignments SET status = 'Time Exceeded' WHERE assignment_id = ?",
                [assignmentId]
            );
            job.stop();
        }
    );
}

exports.deleteAssignment = async (req, res) => {
    try {
        const [Assignment] = await dbConnection.execute(`SELECT assignment_file FROM assignments WHERE assignment_id = ?`, [req.body.assignment_id]);

        const assignmentFile = Assignment[0].assignment_file;

        if (assignmentFile) {
            const imagePath = path.join(__dirname, '..', assignmentFile);
            if (fs.access(imagePath)) {
                fs.unlink(imagePath);
            }
        }

        const [deleteAssignment] = await dbConnection.execute(`DELETE FROM assignments WHERE assignment_id = ?`, [req.body.assignment_id]);

        return res.status(200).json({
            message: "Assignment deleted successfully"
        });
    } catch (err) {
        res.status(500).send({
            message: err.message
        });
    }
};

exports.getAssignmentById = async (req, res) => {
    try {
        const { assignment_id } = req.params;
        const [getAssignmentById] = await dbConnection.execute(`SELECT * FROM assignments where assignment_id=?`, [assignment_id]);

        return res.status(200).json({
            message: "Assignment retrieved successfully",
            data: getAssignmentById[0]
        });
    } catch (err) {
        res.status(500).send({
            message: err.message
        });
    }
};


exports.getAllAssignmentsAdmin = async (req, res) => {
    try {
        const [getAllAssignmentsAdmin] = await dbConnection.execute(`SELECT * FROM assignments`);

        return res.status(200).json({
            message: "Assignments retrieved successfully",
            data: getAllAssignmentsAdmin
        });
    } catch (err) {
        res.status(500).send({
            message: err.message
        });
    }
};

exports.getAllAssignments = async (req, res) => {
    try {
        const isAdmin = req.data.user_type === "admin";
        const userId = req.data.id;
        
        // Common Query Parts
        const baseQuery = `
            SELECT 
                a.assignment_id,
                sa.submission_id,
                a.title AS assignment_name,
                a.description,
                a.assignment_file,
                a.deadline,
                a.course_type,
                IF(sa.submission_file IS NOT NULL, 'Submitted', 'Not Submitted') AS status,
                u.id AS student_id,
                u.name AS student_name,
                u.contact AS contact,
                sa.submission_file,
                sa.obtained_marks,
                sa.checked_by,
                a.created_at,
                a.updated_at
            FROM 
                assignments a
            LEFT JOIN 
                users u 
                ${isAdmin ? `
                    ON (u.selected_course = 'Both' AND a.course_type IN ('OS', 'AS','P2 Crash Course','Crash Composite','P4 Crash Course'))
                    OR u.selected_course = a.course_type
                ` : `
                    ON u.id = ?
                `}
            LEFT JOIN 
                assignment_submissions sa 
            ON 
                a.assignment_id = sa.assignment_id 
                AND u.id = sa.student_id
            WHERE 
                u.user_type != 'admin'
                ${!isAdmin ? `AND (
                    (u.selected_course = 'Both' AND a.course_type IN ('OS', 'AS','P2 Crash Course','Crash Composite','P4 Crash Course'))
                    OR u.selected_course = a.course_type
                )` : ''}
        `;

        const [getAllAssignments] = await dbConnection.execute(
            baseQuery,
            isAdmin ? [] : [userId]
        );

        return res.status(200).json({
            message: "Assignments retrieved successfully",
            data: getAllAssignments
        });

    } catch (err) {
        res.status(500).send({
            message: err.message
        });
    }
};
