exports.isAdmin = (req, res, next) => {
    if(req.data.user_type!=="admin"){
     return res.status(401).send({
         message: "You are not an admin"
     })
    }
     next();
 }
