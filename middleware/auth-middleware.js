const jwt = require('jsonwebtoken');
const dbConnection = require('../db-connection');

exports.verifyToken = async (req, res, next) => {
    const token = req.headers.accesstoken;
    const access_token = token?.split('Bearer ')[1];
    const token2 = req.headers.refreshtoken;
    const refresh_token = token2?.split('Bearer ')[1];

    if (!access_token) {
        return res.status(401).send({ success: false, message: 'Unauthorized: No token provided' });
    }

    const [checkAccessTokenInDBUsers] = await dbConnection.execute(`SELECT * from users where access_token = '${access_token}'`)
    if (checkAccessTokenInDBUsers.length == 0) {
        return res.status(400).send({
            message: 'Invalid access token'
        })
    }
    jwt.verify(access_token, 'access token jwt', async (err, decoded) => {
        if (err) {
            if (!refresh_token) {
                return res.status(401).send({
                    failed: false,
                    message: 'Unauthorized'
                });
            }
            const [checkRefreshTokenInDBUsers] = await dbConnection.execute(`SELECT * from users where refresh_token = '${refresh_token}'`)
            if (checkRefreshTokenInDBUsers.length == 0) {
                return res.status(400).send({
                    message: 'Invalid refresh token'
                })
            }
            jwt.verify(refresh_token, 'refresh token jwt', (err, decoded) => {
                if (err) {
                    return res.status(401).send({
                        failed: false,
                        message: 'Unauthorized'
                    });
                }
                req.data = decoded;
                next();
            });
        } else {
            req.data = decoded;
            next();
        }
    });
};