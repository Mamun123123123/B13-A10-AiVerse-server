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
const bookmarkCollection = db.collection("bookmarks");


app.post("/api/prompts", async (req, res) => {
  try {
    const prompt = req.body;

    if (!prompt.userEmail) {
      return res.status(400).send({
        success: false,
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
      userName: prompt.userName || "",

     
      role: prompt.role || "user",

      copyCount: 0,
      status: "pending",

      featured: false,

      createdAt: new Date(),
    };

    const result =
      await promptCollection.insertOne(
        newPrompt
      );

    res.send({
      success: true,
      insertedId: result.insertedId,
      message:
        "Prompt submitted successfully and waiting for admin approval",
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      success: false,
      error: "Create failed",
    });
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


app.get("/api/all-prompts", async (req, res) => {
  try {
    const { search, category, difficulty, aiTool, sort } = req.query;

    let query = {
      visibility: "Public",
      status: "approved",
    };

 
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { aiTool: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    
    if (category && category !== "All") {
      query.category = category;
    }

  
    if (difficulty && difficulty !== "All") {
      query.difficulty = difficulty;
    }

    if (aiTool && aiTool !== "All") {
      query.aiTool = aiTool;
    }

  
    let sortOption = { createdAt: -1 }; // latest default

    if (sort === "popular") {
      sortOption = { rating: -1 }; // future rating system
    }

    if (sort === "copied") {
      sortOption = { copyCount: -1 };
    }

    if (sort === "latest") {
      sortOption = { createdAt: -1 };
    }

    const result = await promptCollection
      .find(query)
      .sort(sortOption)
      .toArray();

    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      error: "All prompts fetch failed",
    });
  }
});


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


app.post("/api/bookmarks", async (req, res) => {
  try {
    const { promptId, userEmail } = req.body;

    const exists = await bookmarkCollection.findOne({
      promptId,
      userEmail,
    });

    if (exists) {
      return res.status(400).send({
        error: "Already bookmarked",
      });
    }

    const prompt = await promptCollection.findOne({
      _id: new ObjectId(promptId),
    });

    if (!prompt) {
      return res.status(404).send({
        error: "Prompt not found",
      });
    }

    const bookmark = {
      promptId,
      userEmail,

      title: prompt.title,
      category: prompt.category,
      thumbnail: prompt.thumbnail,

      createdAt: new Date(),
    };

    const result =
      await bookmarkCollection.insertOne(
        bookmark
      );

    res.send(result);
  } catch (error) {
    console.error(error);

    res.status(500).send({
      error: "Bookmark failed",
    });
  }
});

app.get("/api/bookmarks", async (req, res) => {
  try {
    const email = req.query.email;

    const result =
      await bookmarkCollection
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
      error: "Bookmarks fetch failed",
    });
  }
});

app.delete(
  "/api/bookmarks/:id",
  async (req, res) => {
    try {
      const result =
        await bookmarkCollection.deleteOne({
          _id: new ObjectId(
            req.params.id
          ),
        });

      res.send(result);
    } catch (error) {
      console.error(error);

      res.status(500).send({
        error: "Remove failed",
      });
    }
  }
);

app.get(
  "/api/bookmarks/check",
  async (req, res) => {
    try {
      const { promptId, email } = req.query;

      const bookmark =
        await bookmarkCollection.findOne({
          promptId,
          userEmail: email,
        });

      res.send({
        bookmarked: !!bookmark,
      });
    } catch (error) {
      console.error(error);

      res.status(500).send({
        error: "Check failed",
      });
    }
  }
);


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
