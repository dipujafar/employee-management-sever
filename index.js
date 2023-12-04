const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  const token = req.headers.authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@jafardipu.hwlq4pv.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db("employee").collection("services");
    const reviewCollection = client.db("employee").collection("reviews");
    const userCollection = client.db("employee").collection("users");
    const workCollection = client.db("employee").collection("work");

    // admin middleware verification
    const verifyAdmin = async(req,res,next)=>{
      const email = req.decoded.email;
      const query = {email: email};
      const user = await userCollection.findOne(query);
      const isAdmin =  user?.role === "Admin" && user.verified == true;
      if(!isAdmin){
        return res.status(403).send({message: "forbidden"});
      };
      next();
    }

    // hr middleware verification
    const verifyHr = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "HR" && user.verified == true;
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden" });
      }
      next();
    };

    // hr related api
    app.get("/users/hr/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        if (email !== req.decoded.email) {
          return res.status(403).send({ message: "forbidden" });
        }

        const query = { email: email };
        const user = await userCollection.findOne(query);
        let hr = false;
        if (user) {
          hr = user?.role === "HR" && user.verified == true;
        }
        res.send({ hr });
      } catch {
        //
      }
    });

    // admin related api
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        if (email !== req.decoded.email) {
          return res.status(403).send({ message: "forbidden" });
        }

        const query = { email: email };
        const user = await userCollection.findOne(query);
        let admin = false;
        if (user) {
          admin = user?.role === "Admin" && user.verified == true;
        }
        res.send({ admin });
      } catch {
        //
      }
    });

    //jwt related apis
    app.post("/jwt", async (req, res) => {
      try {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "1h",
        });
        res.send({ token });
      } catch {
        //
      }
    });
    app.get("/service", async (req, res) => {
      try {
        const result = await serviceCollection.find().toArray();
        res.send(result);
      } catch {
        //
      }
    });

    app.get("/review", async (req, res) => {
      try {
        const result = await reviewCollection.find().toArray();
        res.send(result);
      } catch {
        //
      }
    });

    // employee related api
    app.get("/employees", verifyToken, async (req, res) => {
      try {
        const result = await userCollection.find().toArray();
        res.send(result);
      } catch {
        //
      }
    });

    app.post("/employees", async (req, res) => {
      try {
        const user = req.body;
        const result = await userCollection.insertOne(user);
        res.send(result);
      } catch {
        //
      }
    });

    app.patch("/employees/:id", verifyToken, verifyHr, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          verified: true,
        },
      };
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.patch("/employees/hr/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "HR",
        },
      };
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.patch("/employees/fire/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          fired: true ,
        },
      };
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    //work related apis
    app.get("/work", verifyToken, async(req,res)=>{
      const email = req.query.email;
      const filter = {email: email}
      const result = await workCollection.find(filter).toArray();
      res.send(result);
    });
    app.post("/work", async(req, res)=>{
      const workData = req.body;
      const result = await workCollection.insertOne(workData);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("management is working");
});

app.listen(port, () => {
  console.log(`management is working on port ${port}`);
});
