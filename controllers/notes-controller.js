const dbConnection = require('../db-connection');
const uploadNotes = require('../middleware/note-upload-middleware');
const path = require('path');
const fs = require('fs').promises;
const { promisify } = require('util');


exports.createNote = async (req, res) => {
    try {
        await uploadNotes(req, res);

        const { note_title, note_type, course_type } = req.body;
        let note_bg_image = null;
        let dark_note_attachment = null;
        let light_note_attachment = null;

        if (!note_title || !note_type) {
            await removeUploadedFiles(req.files);
            return res.status(400).json({
                message: "Note title and type are required"
            });
        }

        if (req.files && req.files.note_bg_image) {
            note_bg_image = `/resources/static/assets/uploads/notesUpload/notes-bg-image/${req.files.note_bg_image[0].filename}`;
        }

        if (req.files && req.files.notes) {
            if (note_type === 'dark_mode') {
                dark_note_attachment = `/resources/static/assets/uploads/notesUpload/notes/${req.files.notes[0].filename}`;
            } else if (note_type === 'light_mode') {
                light_note_attachment = `/resources/static/assets/uploads/notesUpload/notes/${req.files.notes[0].filename}`;
            } else {
                await removeUploadedFiles(req.files);
                return res.status(400).json({
                    message: "Invalid note type"
                });
            }
        }

        const [createNote] = await dbConnection.execute(
            "INSERT INTO notes (`note_title`, `note_bg_image`, `dark_note_attachment`, `light_note_attachment`, `note_type`, `course_type`) VALUES (?, ?, ?, ?, ?, ?)",
            [note_title, note_bg_image, dark_note_attachment, light_note_attachment, note_type, course_type]
        );

        if (createNote.affectedRows === 1) {
            return res.status(200).json({
                message: "Note added successfully"
            });
        } else {
            await removeUploadedFiles(req.files);
            return res.status(500).json({
                message: "Could not add note"
            });
        }
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};

async function removeUploadedFiles(files) {
    try {
        if (files && files.note_bg_image) {
            await Promise.all(files.note_bg_image.map(async (file) => {
                const filePath = path.join(__dirname, '..', file.path);
                await fs.unlink(filePath).catch(err => console.error("Error deleting background image:", err.message));
            }));
        }

        if (files && files.notes) {
            await Promise.all(files.notes.map(async (file) => {
                const filePath = path.join(__dirname, '..', file.path);
                await fs.unlink(filePath).catch(err => console.error("Error deleting paper file:", err.message));
            }));
        }
    } catch (error) {
        console.error("Error removing files:", error.message);
    }
}

exports.updateNote = async (req, res) => {
    try {
        uploadNotes(req, res, async (err) => {
            if (err) {
                return res.status(500).send({
                    message: "Failed",
                    data: `Could not process the file: ${err.message}`,
                });
            }

            const { note_id, note_title, note_type, course_type } = req.body;

            const [checkExistence] = await dbConnection.execute(`SELECT * FROM notes WHERE note_id = ?`, [note_id]);
            if (checkExistence.length < 1) {
                await removeUploadedFiles(req.files);
                return res.status(400).json({ message: "Note does not exist" });
            }

            const existingNote = checkExistence[0];
            const oldNoteType = existingNote.note_type;

            let note_bg_image = existingNote.note_bg_image;
            let dark_note_attachment = existingNote.dark_note_attachment;
            let light_note_attachment = existingNote.light_note_attachment;

            if (req.files && req.files.note_bg_image) {
                note_bg_image = `/resources/static/assets/uploads/notesUpload/notes-bg-image/${req.files.note_bg_image[0].filename}`;

                if (existingNote.note_bg_image) {
                    const bgImagePath = path.join(__dirname, '..', existingNote.note_bg_image);
                    try {
                        await fs.access(bgImagePath);
                        await fs.unlink(bgImagePath);
                    } catch (error) {
                        console.error("Background image does not exist or could not be deleted", error.message);
                    }
                }
            }

            if (req.files && req.files.notes) {
                if (note_type === 'dark_mode') {
                    dark_note_attachment = `/resources/static/assets/uploads/notesUpload/notes/${req.files.notes[0].filename}`;

                    if (oldNoteType === 'light_mode' && light_note_attachment) {
                        const lightNotePath = path.join(__dirname, '..', light_note_attachment);
                        try {
                            await fs.access(lightNotePath);
                            await fs.unlink(lightNotePath);
                        } catch (error) {
                            console.error("Light mode file does not exist or could not be deleted", error.message);
                        }
                        light_note_attachment = null;
                    }
                } else if (note_type === 'light_mode') {
                    light_note_attachment = `/resources/static/assets/uploads/notesUpload/notes/${req.files.notes[0].filename}`;

                    if (oldNoteType === 'dark_mode' && dark_note_attachment) {
                        const darkNotePath = path.join(__dirname, '..', dark_note_attachment);
                        try {
                            await fs.access(darkNotePath);
                            await fs.unlink(darkNotePath);
                        } catch (error) {
                            console.error("Dark mode file does not exist or could not be deleted", error.message);
                        }
                        dark_note_attachment = null;
                    }
                } else {
                    await removeUploadedFiles(req.files);
                    return res.status(400).json({
                        message: "Invalid note type"
                    });
                }
            }

            const updateNoteQuery = `UPDATE notes SET note_title = ?, note_bg_image = ?, dark_note_attachment = ?, light_note_attachment = ?, note_type = ?, course_type = ? WHERE note_id = ?`;

            const [updateNote] = await dbConnection.execute(updateNoteQuery, [note_title, note_bg_image, dark_note_attachment, light_note_attachment, note_type, course_type, note_id]);

            if (updateNote.affectedRows === 1) {
                return res.status(200).send({
                    message: "Note updated successfully"
                });
            } else {
                await removeUploadedFiles(req.files);
                return res.status(500).json({
                    message: "Could not update note"
                });
            }
        });
    } catch (err) {
        res.status(500).send({
            message: err.message
        });
    }
};

exports.deleteNote = async (req, res) => {
    try {
        const { note_id } = req.body;

        const [note] = await dbConnection.execute(`SELECT * FROM notes WHERE note_id = ?`, [note_id]);
        if (note.length < 1) {
            return res.status(404).json({ message: "Note not found" });
        }

        const existingNote = note[0];

        const filesToDelete = [];
        if (existingNote.note_bg_image) {
            filesToDelete.push(path.join(__dirname, '..', existingNote.note_bg_image));
        }
        if (existingNote.dark_note_attachment) {
            filesToDelete.push(path.join(__dirname, '..', existingNote.dark_note_attachment));
        }
        if (existingNote.light_note_attachment) {
            filesToDelete.push(path.join(__dirname, '..', existingNote.light_note_attachment));
        }

        for (const filePath of filesToDelete) {
            try {
                await fs.access(filePath);
                await fs.unlink(filePath);
            } catch (error) {
                console.error(error.message);
            }
        }

        const [deleteNoteResult] = await dbConnection.execute(`DELETE FROM notes WHERE note_id = ?`, [note_id]);

        if (deleteNoteResult.affectedRows === 1) {
            return res.status(200).json({ message: "Note deleted successfully" });
        } else {
            return res.status(500).json({ message: "Failed to delete note" });
        }
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

exports.getAllNotes = async (req, res) => {
    try {
        const [getAllNotesBoth] = await dbConnection.execute(`SELECT * FROM notes where course_type IN ('OS','AS')`);

        const [getAllNotes] = await dbConnection.execute(`SELECT * FROM notes where course_type =?`, [req.data.selected_course]);

        return res.status(200).json({
            message: "Notes retrieved successfully",
            data: req.data.selected_course == "Both" ? getAllNotesBoth : getAllNotes
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};

exports.getNoteById = async (req, res) => {
    try {
        const { note_id } = req.params;
        const [note] = await dbConnection.execute(`SELECT * FROM notes WHERE note_id = ?`, [note_id]);

        if (note.length > 0) {
            return res.status(200).json({
                message: "Note retrieved successfully",
                data: note[0]
            });
        } else {
            return res.status(404).json({
                message: "Note not found"
            });
        }
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
};
