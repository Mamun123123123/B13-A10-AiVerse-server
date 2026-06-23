const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const uri = process.env.MONGO_USER;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("AiVerse_db");
    const promptCollection = db.collection("prompts");

    
    app.post("/api/prompts", async (req, res) => {
      try {
        const prompt = req.body;

        if (!prompt.userEmail && !prompt.email) {
          return res.status(400).send({
            error: "Email is required",
          });
        }

        const newPrompt = {
          ...prompt,
          createdAt: new Date(),
        };

        const result = await promptCollection.insertOne(newPrompt);

        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Create failed" });
      }
    });

    
    app.get("/api/prompts", async (req, res) => {
      try {
        const email = req.query.email;

        if (!email) {
          return res.status(400).send({
            error: "Email is required",
          });
        }

        const result = await promptCollection
          .find({
            $or: [
              { userEmail: email },
              { email: email },
            ],
          })
          .sort({ createdAt: -1 }) 
          .toArray();

        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Fetch failed" });
      }
    });

  
    app.get("/api/prompts/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await promptCollection.findOne({
          _id: new ObjectId(id),
        });

        res.send(result);
      } catch (err) {
        res.status(500).send({ error: "Single fetch failed" });
      }
    });

   
    app.put("/api/prompts/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const data = req.body;

        const result = await promptCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              title: data.title,
              description: data.description,
              prompt: data.prompt,
            },
          }
        );

        res.send(result);
      } catch (err) {
        res.status(500).send({ error: "Update failed" });
      }
    });

   
    app.delete("/api/prompts/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await promptCollection.deleteOne({
          _id: new ObjectId(id),
        });

        res.send(result);
      } catch (err) {
        res.status(500).send({ error: "Delete failed" });
      }
    });

   
    await db.command({ ping: 1 });
    console.log("✅ MongoDB Connected Successfully!");
  } finally {
   
  }
}

run().catch(console.dir);


app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});