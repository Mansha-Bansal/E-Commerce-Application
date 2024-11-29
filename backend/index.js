const port =4000;
const express=require("express")
const app=express();
const mongoose=require('mongoose');
const jwt=require('jsonwebtoken')
const multer=require("multer")
const path= require("path")
const cors=require("cors");
const { error } = require("console");
const { type } = require("os");
const nodemailer= require("nodemailer");
const bodyParser=require("body-parser")


app.use(express.json());
app.use(cors());

//Database Connect to MongoDB

mongoose.connect("mongodb+srv://mansha12356:Mansha%40123@cluster0.5jwve.mongodb.net/E-Commerce")
.then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("Error connecting to MongoDB:", err));
//API Creation

app.get('/',(req,res)=>{
    res.send("Express App is Running");
})


// Image Storage Engine
const storage = multer.diskStorage({
    destination:'./upload/images',
    filename:(req,file,cb)=>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload=multer({storage:storage})

//Creating Upload Endpoint for images

app.use('/images',express.static('upload/images'))

app.post('/upload',upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url:`http://localhost:${port}/images/${req.file.filename}`
    })
})

//
const Product = mongoose.model("Product",{
    id:{
        type:Number,
        required:true,
    },
    name:{
        type:String,
        required:true,
    },
    image:{
        type:String,
        required:true,
    },
    category:{
        type:String,
        required:true,
    },
    new_price:{
        type:Number,
        required:true,
    },
    old_price:{
        type:Number,
        required:true
    },
    date:{
        type:Date,
        default:Date.now,
    },
    available:{
        type:Boolean,
        default:true
    }

})

app.post('/addproduct',async(req,res)=>{

    let products = await Product.find({});
    let id;
    if(products.length>0){
        let last_product = products[products.length - 1];
        id = last_product.id + 1; 
    }else{
        id=1;
    }
    const product = new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
    });
    console.log("Saving product:", product);
    await product.save();
    console.log("Product saved successfully");
    res.json({
        success:true,
        name:req.body.name,
    })
})

//Creating API for deleting Products
app.post('/removeproduct',async(req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    res.json({
        success:true,
        name:req.body.name,
    })
})

//Creating API for getting all products
app.get('/allproducts',async(req,res)=>{
    let products = await Product.find({});
    console.log("All Products Fetched");
    res.send(products);
})


//Schema creating for User model

const Users = mongoose.model('Users',{
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    }
})

//Creating Endpoint for registering the user
app.post('/signup',async(req,res)=>{
    let check = await Users.findOne({email:req.body.email});
    if(check){
        return res.status(400).json({success:false,errors:"existing"})
    }

    let cart={};
    for(let i=0;i<300;i++){
        cart[i]=0;
    }

    const user = new Users({
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart,
    })

    await user.save();

    const data = {
        user:{
            id:user.id
        }

    }

    const token = jwt.sign(data,'secret_ecom')
    res.json({success:true,token})
})

//creating endpoint for user login 

app.post('/login',async(req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if(user){
        const passCompare = req.body.password ===user.password;
        if(passCompare){
            const data = {
                user:{
                    id:user.id
                }
            }

            const token = jwt.sign(data,'secret_ecom');
            res.json({success:true,token});
        }
        else{
            res.json({success:false,errors:"Wrong Password"});

        }

    }
    else{
        res.json({success:false,errors:"Wrong Email Id"});
    }
})


// creating endpoint for new collection data
app.get('/newcollections',async(req,res)=>{
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log('NewCollection Fetched');
    res.send(newcollection);
})

// creating endpoint for popular in women section
app.get('/popularinwomen',async(req,res)=>{
    let products = await Product.find({category:"women"});
    let popular_in_women = products.slice(0,4);
    res.send(popular_in_women);
})


//creating midddleware to fetch user
const fetchUser = async(req,res,next)=>{
    console.log('hi');
    const token = req.header('auth-token');
    if(!token){
        res.status(401).send({errors:"Please authenticate using valid token"})

    }else{
        try{
            const data = jwt.verify(token,'secret_ecom');
        
            console.log("Decoded Token Data:", data);

            req.user = data.user; // Attach the user to the request
            console.log("User in Request:", req.user)
            next();
        }catch(error){
            res.status(401).send({errors:"please authenticate using valid token"})
        }
    }
}

//creating endpoint for adding products in cartdata
app.post('/addtocart',fetchUser,async(req,res)=>{
    let userData = await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId]+=1;
    await Users.findOneAndUpdate(
        { _id: req.user.id },
        { $set: { cartData: userData.cartData } },
        { new: true }
      );
    res.send("Added");
})

//creating endpoint to remove product from cartdata
app.post('/removefromcart',fetchUser,async(req,res)=>{
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId]-=1;
    await Users.findOneAndUpdate(
        { _id: req.user.id },
        { $set: { cartData: userData.cartData } },
        { new: true }
      );
    res.send("Removed");
})

//creating endpoint to get cartdata
app.post('/getcart',fetchUser,async(req,res)=>{
    console.log('GetCart');
    let userData = await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);
})

// Endpoint for Newsletter Subscription
app.post("/newsletter",async(req,res)=>{
    const{email} = req.body;

    if(!email||!/\S+@\S+\.\S+/.test(email)){
        return res.status(400).json({success:false,error:"Invalid email address"})

    }

    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465, // Or 587 if needed
        secure: true,
        auth:{
            user:"dakshsharma1490@gmail.com",
            pass:"hjyuosxtprsmsnfg"
        },
    });

    const mailOptions = {
        from:"mbansal_be22@thapar.edu",
        to:email,
        subject:"Welcome to Our Newsletter!",
        text:"Thank You for subscribing to our newsletter ! Stay tuned for updates and promotions.",


    };

    try{
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:",info.response);
        res.json({ success: true, message: "Promotional email sent successfully!" });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ success: false, error: "Failed to send email" });
    }

    }
)



app.listen(port,(error)=>{
    if(!error){
        console.log('server Running on Port'+port)
    }
    else{
        console.log("Error;"+error)
    }
})
