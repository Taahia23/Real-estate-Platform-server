
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
var jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config()
const port = process.env.PORT || 5000;



// middlewares
app.use(cors())
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.g9rirok.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        const propertyCollection = client.db("homezDb").collection("property");
        const reviewCollection = client.db("homezDb").collection("reviews");
        const userReviewCollection = client.db("homezDb").collection("userReview");
        const userCollection = client.db("homezDb").collection("users");
        const wishCollection = client.db("homezDb").collection("wishes");
        const makeOfferCollection = client.db("homezDb").collection("makeOffer");

        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })
        // jwt related api

        // middlewares
        const verifyToken = (req, res, next) => {
            console.log('inside verify token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next()
            }
            )
            // next()
        }


        // use verify admin after verify token
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next()
        }
        // middlewares


        // all Properties
        app.get('/property', async (req, res) => {
            const result = await propertyCollection.find().toArray();
            res.send(result)
        })
       
        // all Properties


        // users related api
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {

            const result = await userCollection.find().toArray();
            res.send(result)
        });

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'unauthorized access' })
            }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin'
            }

            res.send({ admin })
        })

        // eita kintu extra
        app.get('/users/agent/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'unauthorized access' })
            }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let agent = false;
            if (user) {
                agent = user?.role === 'agent'
            }

            res.send({ agent })
        })
        // eita kintu extra




        app.post('/users', async (req, res) => {
            const user = req.body;

            const query = { email: user.email };
            const existingUser = await userCollection.findOne(query)

            if (existingUser) {
                return res.send({ message: 'user already exist', insertedId: null })
            }

            const result = await userCollection.insertOne(user);
            res.send(result)
        });

        // make admin
        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })
        // make admin
        // make agent
        app.patch('/users/agent/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'agent'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })
        // make agent

        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query);
            res.send(result)
        })


        // users related api


        // single property page
        app.get('/property/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) };
            const result = await propertyCollection.findOne(query);
            res.send(result);
        })
        // single property page

        //  reviews data load
        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result)
        });
        //  reviews data load

        // user review api
        app.get('/reviews', async (req, res) => {
            const result = await userReviewCollection.find().toArray();
            res.send(result)
        });

        app.post('/userReview', async (req, res) => {
            const wishItem = req.body;
            const result = await userReviewCollection.insertOne(wishItem);
            res.send(result);
        })

        // user review api

        // wishlist related api

        app.get('/wishes', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await wishCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/wishes', async (req, res) => {
            const wishItem = req.body;
            const result = await wishCollection.insertOne(wishItem);
            res.send(result)
        })

        app.delete('/wishes/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await wishCollection.deleteOne(query);
            res.send(result)
        })
        // wishlist related api

        // make an offer


        app.get('/property/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const options = {
                projection: {
                    priceRange: 1, propertyTitle: 1, agentName: 1, location: 1, propertyImg: 1
                },
            };
            const result = await propertyCollection.findOne(query, options);
            // console.log(216,query, result);
            res.send(result);
        })
        // uncomment this if below get method does not work

        // app.get('/makeOffer', async (req, res) => {
        //     // const query = { email: req.query.email }

        //     const result = await makeOfferCollection.find().toArray();
        //     res.send(result)
        // })
        // uncomment this if below get method does not work

        app.get('/makeOffer', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await makeOfferCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/makeOffer', async (req, res) => {
            const makeOffer = req.body;
            console.log(makeOffer);
            const result = await makeOfferCollection.insertOne(makeOffer);
            res.send(result)

        })
        // make an offer

        // add property related api
        app.post('/property', async (req, res) => {
            const item = req.body;
            const result = await propertyCollection.insertOne(item);
            res.send(result)
        })
        app.delete('/property/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await propertyCollection.deleteOne(query);
            res.send(result)
        })
        // add property related api
        // update property api
        app.patch('/property/:id', async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter =  { _id: new ObjectId(id) };
            const updatedDoc ={
                $set: {
                    propertyTitle: item.propertyTitle,
                    propertyImg: item.propertyImg,
                    location: item.location,
                    priceRange: item.priceRange,
                    agentName: item.agentName,
                    agentEmail: item.agentEmail,
                }
            }
            const result =await propertyCollection.updateOne(filter, updatedDoc);
            res.send(result)
        })
        // update property api


        // search button in all properties
        // app.get('/property', async(req, res) => {
        //     // const { propertyTitle } = req.query;
        //     query = { propertyTitle: req.query.propertyTitle }


        //     const filteredProperties = await propertyCollection.filter(property =>
        //       property.propertyTitle.toLowerCase().includes(propertyTitle.toLowerCase())
        //     );

        //     res.send(filteredProperties);
        //   });
        // search button in all properties






        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);







app.get('/', async (req, res) => {
    res.send('homez is running');
});

app.listen(port, () => {
    console.log(`homez server is running on port ${port}`);
})