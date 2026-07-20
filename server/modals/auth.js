import mongoose from "mongoose"
const userschema = mongoose.Schema ({
    name: {type: String },
    email: {type: String, required: true},
    channelname: {type: String},
    description: {type: String},
    image: {type: String},
    joinedon: {type: Date, default: Date.now},
});

export default mongoose.model("User", userschema);
