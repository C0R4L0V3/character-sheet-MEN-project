const passUserToView = (req, res, next) => {
//if user is signed in, assing the value of res.locals.user to the value of req.session.user
//else user value is null

    res.locals.user = req.session.user ? req.session.user : null;
    next();
};

module.exports = passUserToView
