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
    const reviewCollection = db.collection("reviews"); 
    const userCollection = db.collection("users");

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
          difficulty: prompt.difficulty || "Beginner",
          thumbnail: prompt.thumbnail || "",
          visibility: prompt.visibility || "Public",

          userEmail: prompt.userEmail,
          userName: prompt.userName || "",
          role: prompt.role || "user",

          copyCount: 0,
          status: "pending",
          featured: false,

          createdAt: new Date(),
        };

        const result = await promptCollection.insertOne(newPrompt);

        res.send({
          success: true,
          insertedId: result.insertedId,
          message: "Prompt submitted successfully",
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Create failed" });
      }
    });

    app.get("/api/prompts", async (req, res) => {
      try {
        const email = req.query.email;

        if (!email) {
          return res.status(400).send({ error: "Email required" });
        }

        const result = await promptCollection
          .find({ userEmail: email })
          .sort({ createdAt: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Fetch failed" });
      }
    });
    app.post("/api/users", async (req, res) => {
  try {
    const user = req.body;

    const existingUser = await userCollection.findOne({
      email: user.email,
    });

    if (existingUser) {
      return res.send(existingUser);
    }

    const newUser = {
      name: user.name,
      email: user.email,
      image: user.image || "",
      role: user.role || "user",
      createdAt: new Date(),
    };

    const result = await userCollection.insertOne(newUser);

    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Create user failed" });
  }
});

// Get all prompts
app.get("/api/admin/prompts", async (req, res) => {
  const prompts = await promptCollection
    .find()
    .sort({ createdAt: -1 })
    .toArray();

  res.send(prompts);
});

// Update status
app.patch("/api/admin/prompts/:id/status", async (req, res) => {
  const { status, feedback } = req.body;

  const result = await promptCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    {
      $set: {
        status,
        feedback: feedback || "",
      },
    }
  );

  res.send(result);
});

// Toggle feature
app.patch("/api/admin/prompts/:id/feature", async (req, res) => {
  const { featured } = req.body;

  const result = await promptCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    {
      $set: { featured },
    }
  );

  res.send(result);
});

// Delete
app.delete("/api/admin/prompts/:id", async (req, res) => {
  const result = await promptCollection.deleteOne({
    _id: new ObjectId(req.params.id),
  });

  res.send(result);
});

app.get("/api/admin/users", async (req, res) => {
  try {
    const users = await userCollection
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.send(users);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Fetch users failed" });
  }
});

app.patch("/api/admin/users/:id", async (req, res) => {
  try {
    const { role } = req.body;

    const result = await userCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          role,
        },
      }
    );

    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Role update failed" });
  }
});

app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    const result = await userCollection.deleteOne({
      _id: new ObjectId(req.params.id),
    });

    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Delete user failed" });
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

        if (category && category !== "All") query.category = category;
        if (difficulty && difficulty !== "All") query.difficulty = difficulty;
        if (aiTool && aiTool !== "All") query.aiTool = aiTool;

        let sortOption = { createdAt: -1 };

        if (sort === "copied") sortOption = { copyCount: -1 };

        const result = await promptCollection
          .find(query)
          .sort(sortOption)
          .toArray();

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Fetch failed" });
      }
    });

    app.get("/api/prompts/:id", async (req, res) => {
      try {
        const result = await promptCollection.findOne({
          _id: new ObjectId(req.params.id),
        });

        if (!result) {
          return res.status(404).send({ error: "Not found" });
        }

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Fetch failed" });
      }
    });

    app.patch("/api/prompts/copy/:id", async (req, res) => {
      try {
        const result = await promptCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $inc: { copyCount: 1 } }
        );

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Copy failed" });
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
          return res.status(400).send({ error: "Already bookmarked" });
        }

        const prompt = await promptCollection.findOne({
          _id: new ObjectId(promptId),
        });

        const bookmark = {
          promptId,
          userEmail,
          title: prompt.title,
          category: prompt.category,
          thumbnail: prompt.thumbnail,
          createdAt: new Date(),
        };

        const result = await bookmarkCollection.insertOne(bookmark);

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Bookmark failed" });
      }
    });

    app.get("/api/bookmarks", async (req, res) => {
      try {
        const email = req.query.email;

        const result = await bookmarkCollection
          .find({ userEmail: email })
          .sort({ createdAt: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Fetch failed" });
      }
    });

    app.delete("/api/bookmarks/:id", async (req, res) => {
      try {
        const result = await bookmarkCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Delete failed" });
      }
    });

    app.get("/api/bookmarks/check", async (req, res) => {
      try {
        const { promptId, email } = req.query;

        const data = await bookmarkCollection.findOne({
          promptId,
          userEmail: email,
        });

        res.send({ bookmarked: !!data });
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Check failed" });
      }
    });



    app.post("/api/reviews", async (req, res) => {
      try {
        const { promptId, userEmail, rating, comment } = req.body;

        if (!promptId || !userEmail) {
          return res.status(400).send({ error: "Missing fields" });
        }

        const review = {
          promptId,
          userEmail,
          rating: Number(rating) || 0,
          comment: comment || "",
          createdAt: new Date(),
        };

        const result = await reviewCollection.insertOne(review);

        res.send({ _id: result.insertedId, ...review });
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Review failed" });
      }
    });

    app.get("/api/reviews/:promptId", async (req, res) => {
      try {
        const result = await reviewCollection
          .find({ promptId: req.params.promptId })
          .sort({ createdAt: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Fetch failed" });
      }
    });

    app.get("/api/reviews", async (req, res) => {
      try {
        const email = req.query.email;

        const result = await reviewCollection
          .find({ userEmail: email })
          .sort({ createdAt: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Fetch failed" });
      }
    });

    app.get("/api/dashboard/stats", async (req, res) => {
      try {
        const email = req.query.email;

        const totalPrompts = await promptCollection.countDocuments({
          userEmail: email,
        });

        const totalBookmarks = await bookmarkCollection.countDocuments({
          userEmail: email,
        });

        const prompts = await promptCollection.find({ userEmail: email }).toArray();

        const totalCopies = prompts.reduce(
          (sum, item) => sum + (item.copyCount || 0),
          0
        );

        res.send({
          totalPrompts,
          totalBookmarks,
          totalCopies,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Stats failed" });
      }
    });

    console.log("✅ MongoDB Connected Successfully!");
  } finally {
  
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});