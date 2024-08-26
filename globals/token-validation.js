const jwt = require('jsonwebtoken');
const dbConnection = require('../db-connection');


exports.generateToken = async (data) => {
    try {
        var payload = { 
            id : data[0].id,
            name: data[0].name,
            email: data[0].email,
            user_type : data[0].user_type,
            selected_course: data[0].selected_course,
            created_at: data[0].created_at,
            updated_at: data[0].updated_at
         }
        
        const access_token = jwt.sign(payload, 'access token jwt', { expiresIn: "1000d" });
        const refresh_token = jwt.sign(payload, 'refresh token jwt', { expiresIn: "1000d" });

        const updateToken = `UPDATE users SET access_token = ?, refresh_token = ? WHERE email = ?;`;
        const [result] = await dbConnection.execute(updateToken, [access_token, refresh_token, data[0].email]);

        if (result.affectedRows === 1) {
            return {
                message: "success",
                data: "successfully login",
                access_token,
                refresh_token,
                user_data: data
            };
        } else {
            throw new Error("Failed to update tokens");
        }
    } catch (error) {
        console.error("Token generation error:", error);
        throw error;
    }
};

