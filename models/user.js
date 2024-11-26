const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({

//research how to make it so usernames and passwords have to be required to have a set length and charcater sets.

        username: {
            type: String,
            required: true,
        },
        password: {
            type:String,
            required: true,
        },

        displayName: String,

        email: {
            type: String,
            require: false
        },

})

const User = mongoose.model('User', userSchema);

module.exports = User


//shorthand
// module.exports = mongoose.model('User', userSchema)