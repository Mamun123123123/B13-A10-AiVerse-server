const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
res.send("AiVerse API Running 🚀");
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

// =====================================
// CREATE PROMPT
// =====================================
app.post("/api/prompts", async (req, res) => {
  try {
    const prompt = req.body;

    if (!prompt.userEmail) {
      return res.status(400).send({
        error: "User email is required",
      });
    }

    const newPrompt = {
      title: prompt.title,
      description: prompt.description,
      prompt: prompt.prompt,

      category: prompt.category || "",
      aiTool: prompt.aiTool || "",
      tags: prompt.tags || [],

      difficulty:
        prompt.difficulty || "Beginner",

      thumbnail:
        prompt.thumbnail || "",

      visibility:
        prompt.visibility || "Public",

      userEmail: prompt.userEmail,

      copyCount: 0,

      // Admin system পরে করলে pending করবা
      status: "approved",

      featured: false,

      createdAt: new Date(),
    };

    const result =
      await promptCollection.insertOne(
        newPrompt
      );

    res.send(result);
  } catch (error) {
    console.error(error);

    res.status(500).send({
      error: "Create failed",
    });
  }
});

// =====================================
// MY PROMPTS
// =====================================
app.get("/api/prompts", async (req, res) => {
  try {
    const email = req.query.email;

    if (!email) {
      return res.status(400).send({
        error: "Email is required",
      });
    }

    const result =
      await promptCollection
        .find({
          userEmail: email,
        })
        .sort({
          createdAt: -1,
        })
        .toArray();

    res.send(result);
  } catch (error) {
    console.error(error);

    res.status(500).send({
      error: "Fetch failed",
    });
  }
});

// =====================================
// ALL PUBLIC PROMPTS
// =====================================
app.get("/api/all-prompts", async (req, res) => {
  try {
    const result =
      await promptCollection
        .find({
          visibility: "Public",
          status: "approved",
        })
        .sort({
          createdAt: -1,
        })
        .toArray();

    res.send(result);
  } catch (error) {
    console.error(error);

    res.status(500).send({
      error:
        "All prompts fetch failed",
    });
  }
});

// =====================================
// SINGLE PROMPT
// =====================================
app.get("/api/prompts/:id", async (req, res) => {
  try {
    const result =
      await promptCollection.findOne({
        _id: new ObjectId(
          req.params.id
        ),
      });

    if (!result) {
      return res.status(404).send({
        error: "Prompt not found",
      });
    }

    res.send(result);
  } catch (error) {
    console.error(error);

    res.status(500).send({
      error:
        "Single prompt fetch failed",
    });
  }
});

// =====================================
// UPDATE PROMPT
// =====================================
app.put("/api/prompts/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;

    const result =
      await promptCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            title: data.title,
            description:
              data.description,
            prompt: data.prompt,

            category:
              data.category,

            aiTool:
              data.aiTool,

            tags:
              data.tags || [],

            difficulty:
              data.difficulty,

            thumbnail:
              data.thumbnail,

            visibility:
              data.visibility,
          },
        }
      );

    res.send(result);
  } catch (error) {
    console.error(error);

    res.status(500).send({
      error: "Update failed",
    });
  }
});

// =====================================
// DELETE PROMPT
// =====================================
app.delete("/api/prompts/:id", async (req, res) => {
  try {
    const result =
      await promptCollection.deleteOne({
        _id: new ObjectId(
          req.params.id
        ),
      });

    res.send(result);
  } catch (error) {
    console.error(error);

    res.status(500).send({
      error: "Delete failed",
    });
  }
});

// =====================================
// COPY COUNT INCREMENT
// =====================================
app.patch(
  "/api/prompts/copy/:id",
  async (req, res) => {
    try {
      const result =
        await promptCollection.updateOne(
          {
            _id: new ObjectId(
              req.params.id
            ),
          },
          {
            $inc: {
              copyCount: 1,
            },
          }
        );

      res.send(result);
    } catch (error) {
      console.error(error);

      res.status(500).send({
        error:
          "Copy count update failed",
      });
    }
  }
);

await db.command({ ping: 1 });

console.log(
  "✅ MongoDB Connected Successfully!"
);


} finally {
}
}

run().catch(console.dir);

app.listen(port, () => {
console.log(
`🚀 Server running on port ${port}`
);
});
