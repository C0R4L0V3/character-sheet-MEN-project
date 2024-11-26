const dotenv = require('dotenv'); // required package
dotenv.config(); // loads enviroment

const express = require('express');
const app = express();

const mongoose = require('mongoose');
const methodOverride = require('method-override');
const morgan = require('morgan');
const session = require('express-session');

const MongStore = require('connect-mongo'); // stores internal memory on mongodb

//custom middleware
const isSignedIn = require('./middleware/is-signed-in.js');
const passUserToView = require('./middleware/pass-user-to-view.js');
const authController = require('./controllers/auth.js');

//ternary for port location
const port = process.env.PORT ? process.env.PORT : '3000';

//connects to the Mongo DB using the connection string in the .env file
mongoose.connect(process.env.MONGODB_URI);
//logs connection
mongoose.connection.on('connected', () => {
console.log(`Connected to Mongo Database ${mongoose.connection.name}`);
});

//model pathing
const Character = require('./models/char-sheet.js');
const User = require('./models/user.js');


//== Middleware Stack==
//middleware to parse URL-encoded data from forms
app.use(express.urlencoded({extended: false}));
//middleware for using HTTPs verb such as PUT or DELETE
app.use(methodOverride('_method'));
//Morgan for logging HTTP requests
app.use(morgan('dev'));
//tells express to try to match requests with files in the directory called 'public'
app.use(express.static('public')); 
//================ COOKIE GENERATOR =========================

//lookup and maybe implemant a token instead??

// Cookie generator using ASCII coding to create and random and encrypted Cookie

const generateCookie = (length) => {
    // empty sting for cookie varible
    let cookie = ''
    //random number generator
    const randomNum = (min, max) => {
        const minNum = Math.ceil(min)
        const maxNum = Math.floor(max)
        return Math.floor(Math.random() * ( maxNum + minNum) + minNum)
    };
    
    // for loop the loop thought designated cookie length
    for (let i = 0; i < length; i++){
        //assigns the value from randomNum function to a ASCII character
        let char = String.fromCharCode(randomNum(33, 122))
        //adds the character to the cookie string
        cookie += char
    }

    //returns the the randomly generated string
    return cookie

};

const cookie = generateCookie(30)

//Cookie middleware

app.use(
    session({
        secret: cookie,
        resave: false,
        saveUninitialized: true,
        store: MongStore.create({
            mongoUrl: process.env.MONGODB_URI,
        }),
    })
);


//===========================================================

//passes the user information to all views if logged in
app.use(passUserToView);

//handles requests mathing the  /auth url pattern
app.use('/auth', authController)

//================function handler

const updateFields = (mainObj) => {
    const updateObj = {}
    for (const key in mainObj) {

        //split up object into an array of strings
    const currKey = key.split(".")

    let currLocation = updateObj;

    for (let i = 0; i < currKey.length; i++) {
        const currSubKey = currKey[i];
        if( i < currKey.length - 1) {
            //if "location" of sub key does not exsist , cratn objec of the subey location, currlocation will equal a new object
            if ( !currLocation[currSubKey]) currLocation[currSubKey] = {}
            currLocation = currLocation[currSubKey]
        } else {
            let value = mainObj[key]
            //check if the string is a number

            //handler for array of false/true
            if (Array.isArray(value)){
                value = value.includes("true")
            }


            if (!isNaN(parseInt(mainObj[key]))) value = parseInt(mainObj[key]);
            //checks if a boolean
            else if ( value === 'true') value = true;
            else if ( value === 'false') value = false;
            // else value = mainObj[key];
            
        
            currLocation[currSubKey] = value
                 
        }
    }
    
}
return updateObj
};



//======================= MAIN PATHS AND HANDLERS ===========

// Home page - pathed to index.ejs
app.get('/', (req, res) =>{
    res.render('index.ejs')
})

//collection index
app.get('/indexchars', async (req, res) => {

    try {
    const allChars = await Character.find()
    .populate('charOwner', 'username') //pulls and populates the information from the  user model
    
    res.render('chars/indexchars.ejs', {
        allChars: allChars,
                 
    });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching Characters')
        
    }
});

//======== changed site plan no longer needed ==========
//redirects user to sign-in/sign-up page if they are not logged in
app.get('/charcreate', isSignedIn, (req, res) => { 
    // if user is in a session, renders char creation page, or redirects to the sign page
    res.render('chars/charcreate.ejs');

})

//path to mychars
app.get('/mychars', async (req, res) =>{

    try {
    //looks up Users created Characters
    const myChars = await Character.find({owner: req.session._id})
        res.render('chars/mychars.ejs', {
            myChars: myChars
        });
    } catch (error){
        console.error(error);
        res.status(500).send('Error fetching Character list')
    }
});


//creates new character
app.post('/charcreate', async (req, res) => {

   try { 
    // links the new character to the user account
    req.body.charOwner = req.session.user._id
    //logs the date when created/ or updated
    //not sure why this wont work, we'll circle back
    const newDate = new Date();
    req.body.date = newDate.toDateString();

    //going to the do the same thin in the edit route to fixe number not correctily updating in creation
    // const createObj = updateFields(req.body)

    await Character.create(req.body);
    //should hopefully redirect the newly created chacter the edit sheet
    res.redirect(`/mychars`);
    } catch (errror){
        console.error(error);
        res.status(500).send('Error Trying to create Character')
    }
});


//paths to show page
app.get('/show/:charId', async (req, res) => {

    try { 
        const foundChar = await Character.findById(req.params.charId)
        .populate('charOwner', '_id username');

    res.render('chars/show.ejs', {
        charInfo: foundChar,
    });
    } catch (error){
        console.error(error);
        res.status(500).send('Error fetching Character details');
    }
});

//paths to edit page
app.get('/chars/:charId/edit', async (req, res) => {

    try {
        const charInfo = await Character.findById(req.params.charId)
        // console.log(charInfo);
        
        res.render('chars/edit.ejs', {
            charInfo
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching Edit page')
    }
});

//update handler

//notes 
//with the large Char-sheet model we need to do:
    //extract the request body fo the form
    //loops through the object checking keys for boolean properties
    //change value of booleans from 'on' to true or false
    //then update the object
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
    // The Object() constructor turns the input into an object. Its behavior depends on the input's type.
    //The hasOwnProperty() method returns true if the specified property is a direct property of the object — even if the value is null or undefined. The method returns false if the property is inherited, or has not been declared at all.
    //The in operator returns true if the specified property is in the specified object or its prototype chain.
    //The call() method of Function instances calls this function with a given this value and arguments provided individually.


    //moved this function outside of the put route
    
    
//     const updateObj = {}
// for (const key in body) {
  
//   const currKey = key.split(".");
  
//   let currLocation = updateObj;
//   for (let i = 0; i < currKey.length; i++) {
//     const currSubKey = currKey[i];
//     if (i < currKey.length - 1) {
//       if (!currLocation[currSubKey]) currLocation[currSubKey] = {}
//       currLocation = currLocation[currSubKey]
//     }
//     if (i === currKey.length - 1) currLocation[currSubKey] = body[key]
//   }
// }

    // const prepCharData = (charInfo) => {
    //     const abilites = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];

    //     const processData = Object.entries(charInfo),reduce((accumlator, [key, value]) => {
    //         if (abilites.includes(key)) {
    //             accumlator.abilites.push({name: key, data: value});
    //         } else { 
    //             accumlator.other[key] = value; 
    //         }
    //         return ac
    //     })
    // }

            //if main object ( char - sheet) key, equals an object and not null or an array
                // if( typeof mainObj[key] === 'object' && mainObj[key] && !Array.isArray(mainObj[key])) {
                //     // recursiviely handles the nested objects
                //     if ( updateObj && key in updateObj) {
                //         updateFields(mainObj[key], updateObj[key])
                //         console.log(`processing ${key}`);
                        
                //     }
                // } else if (typeof mainObj[key] === 'boolean'){
                //     //handle booleans
                //     if (updateObj && key in updateObj) {
                //         mainObj[key] = updateObj[key] === 'on' //if check box is check, make true
                //     } else {
                //         mainObj[key] = false // if no checked defualt to false
                //     }
                // } else if (typeof mainObj[key] === 'number') {
                //     // we need to make sure we also handle numeric fields
                //     if (updateObj && key in updateObj) {
                //         //i'm using a number constuctor to make sure the values are set as a number when updated 
                //         //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/Number
                //         origObj[key] = Number(updateObj[key])
                //     }

                // }

   



app.put('/chars/:charId', async (req, res) => {

    try {
          //updates edit date
        // const newDate = new Date();
        // req.body.date = newDate.toDateString();
        //simpliefied
        req.body.date = new Date().toDateString();

        //retrieveing the character document
        // const charsheet = await Character.findById(req.params.charId)

        //putting an an error catch if document doesnt exsist
        // if (!charsheet) {
        //     return res.status(404).send('Character not found')
        // }
        // calling updateFields function and  using the tobject constuctor to return the values of the updated object (char-sheet document) to apply changes to the request body
        // updateFields(charsheet.toObject(), req.body);
        console.log(req.body);

        const updateObj = updateFields(req.body)

        // update document in a database
        await Character.findByIdAndUpdate(req.params.charId, updateObj, 
            //i think findByIdAndUpdate is skipping false values
            //using the $set operator to ensure false values
            { $set: updateObj },
            { new: true, runValidation: true,}
        )
        console.log(JSON.stringify(updateObj, null, 2));
        
        // console.log(updateObj);
        
        
        // await charsheet.save()

        res.redirect(`/show/${req.params.charId}`);
        
    } catch (error){
        console.error(error);
        res.status(500).send('Error trying to update character')
    };


});

//=============deleeting document ===========


app.delete('/chars/:charId', async (req, res)=> {
    try {
    await Character.findByIdAndDelete(req.params.charId)
   res.redirect('/mychars')
    } catch (error) {
        console.log(error);
        res.status(500).send('Can not Delete')
        
    }
})






























app.listen(port, () => {
    console.log(`Express app is listening on port ${port}`);
    
})


//================================== GRAVE YARD ===============================

    //putting req.body into a varible for the loop
    // const update = req.body;
    
    // //varrible decalred as an empty object
    // const transformAndUpdate = {};
    // //loops through body form
    // for(const key in update){
    //     //if model has matching keys to the req.body checkboxes, change the value of those keys from 'on' to true, or false if not checked and puts them into the object transformAndUpdate
    //     if(Object.hasOwnProperty.call(update, key)) {
    //         transformAndUpdate[key] = update[key] === 'on'
    //     }
    // };
    
    //updateBoolean(origObj[key], data[key] || {})

    //     //I need to use a recursive loop to get into nested objects to beable to update all boolean fields
    //     const updateBoolean = (origObj, updateObj) => {
    //         for (const key in origObj) {
    //              console.log(`processing ${key}`)
    // //if original object key equals another object, and does no equal null or an array 
    //             if (typeof origObj[key] === 'object' && origObj[key] !== null && !Array.isArray(origObj[key])) {
    //             // and if the updated object and type of updated object key equals an object
    //                 if (updateObj && key === 'object') {
    //                     //recursively maps object apply the updateBoolean function to each value pair  
    //                     updateBoolean(origObj[key], updateObj[key]);
    //                 };    
    //             } else if (typeof origObj[key] === 'boolean') {
    // //because im already checking if the origObj[key] is a boolean or not, I only need to change the value to true ot false
    // //update the boolean based on the value of the request body if possible, otherwise i want to keep the same value
    //                 if(updateObj && key in updateObj) {
    // //the double !! converts to a boolean, true or false
    //                 origObj[key] = updateObj[key] === 'on' 
    //                 } else {
    //                     origObj[key] = false;
    //                 }
    //             }
    //         }  
    //     };

    // trying the lean() to help query the document faster
        //https://mongoosejs.com/docs/tutorials/lean.html
        // const charsheet = await Character.findById(req.params.charId).lean();

        //https://mongoosejs.com/docs/tutorials/lean.html