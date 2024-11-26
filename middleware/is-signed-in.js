//handles if the user is signed in or not using the next function

const isSignedIn = (req, res, next) => {
    // if user logged in a session lets the continue
    if (req.session.user) return next();
    //else redirects them to the sign/sign up page
    res.redirect('auth/sign-in')
    //bug found ** redirect was spelled redirct
};

module.exports = isSignedIn