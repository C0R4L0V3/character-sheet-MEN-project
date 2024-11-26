//dependancies
const bcrypt = require('bcrypt');
const express = require('express');
const router = express.Router();

const User = require('../models/user.js');


// ====================== SIGN Up PAGE

//routes to the sign-up page

router.get('/sign-up', (req, res) => {
    res.render('auth/sign-up.ejs');
});

//account creation handler
router.post('/sign-up', async (req, res) => {

    //checks avability of the username
    const userInDatabade = await User.findOne ({ username: req.params.username });
    if (userInDatabade){
        return res.send("Username already taken");
    }
    //compares and validates if passwords match on sign up
    if (req.body.password !== req.body.confirmPass){
        return res.send("Passwords do not match.")
    }
    //if checks are passed, hash and salt password and create user

    //hashes and salts password in database
    const hashedPassword = bcrypt.hashSync(req.body.password, 10);
    //bug found ** haa a , instead of a . which broke this code
    req.body.password = hashedPassword;

    
    const user = await User.create (req.body);

    //lets loging the user and take them back to the main menu

    //stores user id and name in cookies
    req.session.user = {
        _id: user._id,
        username: user.username,
    };

    req.session.save(() =>{
        res.redirect('/')
    });
});

//==================== SIGN IN PAGE

//routes to sign in page
router.get('/sign-in', (req, res) =>{
    res.render('auth/sign-in.ejs');
});

//account sign-in handler

router.post('/sign-in', async (req, res) => {

    try {
        const userInDatabade = await User.findOne({username: req.body.username});

        //checks for user in Database
        if (!userInDatabade){
            return res.send('No User Found');
        };

        const validatePW = bcrypt.compareSync(
            req.body.password,
            userInDatabade.password 
        );
        
        //compares and validates PW in database for user
        if (!validatePW){
            return res.send('Incorrect Password')
        };

        // creates session for user in cookies
    req.session.user = {
        _id: userInDatabade._id,
        username: userInDatabade.username,
    };

    res.redirect('/')


    } catch (error) {
        console.log(error);
        

    };
});

//========== ACCOUNT SIGN OUT HANDLER =========

router.get('/sign-out', (req, res) => {
        // destroys user session and redirects to home page
        req.session.destroy(() => {
            res.redirect('/')
        });
});

//====== TO ADD

//acount settings

//acount deletion







module.exports = router