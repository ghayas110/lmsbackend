const dbConnection = require('../db-connection');
const path = require('path');
const fs = require('fs')
const { promisify } = require('util')
const unlinkAsync = promisify(fs.unlink)
const multer = require("multer");
const uploadAssignmentSubmission = require('../middleware/assignment-submission-upload.middleare');


exports.submitAssignment = async (req, res) => {
    try {
        await uploadAssignmentSubmission(req, res);

        const { assignment_id } = req.body;
        const student_id = req.data.id;

        const [assignment] = await dbConnection.execute("SELECT status FROM assignments WHERE assignment_id = ?", [assignment_id]);

        if (assignment.length === 0) {
            removeUploadedAssignmentsFile(req.file.path);
            return res.status(404).json({
                message: "Assignment not found"
            });
        }

        const assignmentStatus = assignment[0].status;

        if (assignmentStatus === 'Time Exceeded') {
            removeUploadedAssignmentsFile(req.file.path);
            return res.status(400).json({
                message: "Assignment submission time has exceeded."
            });
        }

        const [existingSubmission] = await dbConnection.execute(
            "SELECT * FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?",
            [assignment_id, student_id]
        );

        if (existingSubmission.length > 0) {
            removeUploadedAssignmentsFile(req.file.path);
            return res.status(400).json({
                message: "Assignment already submitted."
            });
        }

        let submissionStatus = 'Submitted';
        const submissionFile = req.file ? `/resources/static/assets/uploads/assignmentSubmissions/${req.file.filename}` : null;

        const [submitAssignment] = await dbConnection.execute(
            "INSERT INTO assignment_submissions (assignment_id, student_id, submission_file, status) VALUES (?, ?, ?, ?)",
            [assignment_id, student_id, submissionFile, submissionStatus]
        );

        if (submitAssignment.affectedRows === 1) {
            return res.status(200).json({
                message: "Assignment submitted successfully",
                status: submissionStatus
            });
        } else {
            removeUploadedAssignmentsFile(req.file.path);
            return res.status(500).json({
                message: "Could not submit assignment"
            });
        }

    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};

function removeUploadedAssignmentsFile(file) {
    if (file) {
        const filePath = path.join(__dirname, '..', file);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}

exports.updateSubmittedAssignment = async (req, res) => {
    try {
        await uploadAssignmentSubmission(req, res);
        const { submission_id } = req.body;
        const student_id = req.data.id;

        if (!submission_id) {
            removeUploadedAssignmentsFile(req.file.path);
            return res.status(400).json({
                message: "Submission ID is required"
            });
        }

        const [existingSubmission] = await dbConnection.execute(
            "SELECT * FROM assignment_submissions WHERE submission_id = ? AND student_id = ?",
            [submission_id, student_id]
        );

        if (existingSubmission.length === 0) {
            removeUploadedAssignmentsFile(req.file.path);
            return res.status(404).json({
                message: "Submission not found"
            });
        }

        const [assignment] = await dbConnection.execute(
            "SELECT status FROM assignments WHERE assignment_id = ?",
            [existingSubmission[0].assignment_id]
        );

        if (assignment.length === 0 || assignment[0].status === 'Time Exceeded') {
            removeUploadedAssignmentsFile(req.file.path);
            return res.status(400).json({
                message: "Assignment cannot be updated. Status is 'Time Exceeded'."
            });
        }

        let submissionFile = existingSubmission[0].submission_file;
        if (req.file) {
            removeUploadedAssignmentsFile(submissionFile);

            submissionFile = `/resources/static/assets/uploads/assignmentSubmissions/${req.file.filename}`;
        }

        const [updateSubmission] = await dbConnection.execute(
            "UPDATE assignment_submissions SET submission_file = ?, updated_at = CURRENT_TIMESTAMP WHERE submission_id = ?",
            [submissionFile, submission_id]
        );

        if (updateSubmission.affectedRows === 1) {
            return res.status(200).json({
                message: "Assignment submission updated successfully"
            });
        } else {
            removeUploadedAssignmentsFile(req.file.path);
            return res.status(500).json({
                message: "Could not update submission"
            });
        }

    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};

exports.deleteSubmittedAssignment = async (req, res) => {
    try {
        const { submission_id } = req.body;
        const student_id = req.data.id;

        if (!submission_id) {
            return res.status(400).json({
                message: "Submission ID is required"
            });
        }

        const [existingSubmission] = await dbConnection.execute(
            "SELECT * FROM assignment_submissions WHERE submission_id = ? AND student_id = ?",
            [submission_id, student_id]
        );

        if (existingSubmission.length === 0) {
            return res.status(404).json({
                message: "Submission not found"
            });
        }

        const submissionFile = existingSubmission[0].submission_file;

        const [deleteSubmission] = await dbConnection.execute(
            "DELETE FROM assignment_submissions WHERE submission_id = ?",
            [submission_id]
        );

        if (deleteSubmission.affectedRows === 1) {
            if (submissionFile && fs.existsSync(path.join(__dirname, '..', submissionFile))) {
                fs.unlinkSync(path.join(__dirname, '..', submissionFile));
            }
            return res.status(200).json({
                message: "Assignment submission deleted successfully"
            });
        } else {
            return res.status(500).json({
                message: "Could not delete submission"
            });
        }

    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};

exports.getAllSubmittedAssignments = async (req, res) => {
    try {
        const getId = req.data.id;
        const [submissions] = await dbConnection.execute(
            `SELECT a.submission_id, u.name, b.title,b.assignment_file, a.submission_file, a.status, a.obtained_marks, a.checked_by,a.created_at,a.updated_at  
            FROM assignment_submissions a
            JOIN assignments b ON a.assignment_id = b.assignment_id
            JOIN users u ON a.student_id = u.id
            WHERE a.student_id = ?`, [getId]);

        return res.status(200).json(submissions);
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};

exports.getSubmittedAssignmentsById = async (req, res) => {
    try {
        const [submission_id] = req.params.submission_id;
        const [submissions] = await dbConnection.execute(
            `SELECT a.submission_id ,u.name , b.title,b.assignment_file, a.submission_file ,a.status ,a.obtained_marks ,a.checked_by ,a.created_at,a.updated_at  
            FROM assignment_submissions a
            JOIN assignments b ON a.assignment_id = b.assignment_id
            JOIN users u ON a.student_id = u.id
            WHERE a.submission_id = ?`, [submission_id]);

        return res.status(200).json(submissions[0]);
        } catch (err) {
            return res.status(500).json({
                message: err.message
            });
        }
    };

exports.getAllSubmittedAssignmentsAdmin = async (req, res) => {
    try {
        const [getAllSubmissions] = await dbConnection.execute(`SELECT a.submission_id, u.name, b.title,b.assignment_file, a.submission_file, a.status, a.obtained_marks, a.checked_by, a.created_at, a.updated_at
            FROM assignment_submissions a
            JOIN assignments b ON a.assignment_id = b.assignment_id
            JOIN users u ON a.student_id = u.id;`);
        return res.status(200).json(getAllSubmissions);
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};

exports.checkAssignment = async (req, res) => {
    try {
        const { submission_id, obtained_marks } = req.body;
        const admin_id = req.data.id;

        const [submission] = await dbConnection.execute(
            "SELECT * FROM assignment_submissions WHERE submission_id = ?",
            [submission_id]
        );

        if (submission.length === 0) {
            return res.status(404).json({
                message: "Assignment submission not found"
            });
        }

        const [updateSubmission] = await dbConnection.execute(
            `UPDATE assignment_submissions 
             SET status = 'Checked', obtained_marks = ?, checked_by = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE submission_id = ?`,
            [obtained_marks, admin_id, submission_id]
        );

        if (updateSubmission.affectedRows === 1) {
            return res.status(200).json({
                message: "Assignment checked successfully"
            });
        } else {
            return res.status(500).json({
                message: "Could not update assignment submission"
            });
        }

    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};




