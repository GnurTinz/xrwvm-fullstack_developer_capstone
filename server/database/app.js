const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const cors = require('cors');
const app = express();
const port = 3030;

app.use(cors());
app.use(require('body-parser').urlencoded({ extended: false }));

const reviews_path = fs.existsSync("data/reviews.json") ? "data/reviews.json" : "reviews.json";
const dealerships_path = fs.existsSync("data/dealerships.json") ? "data/dealerships.json" : "dealerships.json";

const reviews_data = JSON.parse(fs.readFileSync(reviews_path, 'utf8'));
const dealerships_data = JSON.parse(fs.readFileSync(dealerships_path, 'utf8'));

const Reviews = require('./review');
const Dealerships = require('./dealership');

async function initDB() {
  const mongoURI = process.env.MONGO_URL || "mongodb://mongo_db:27017/";
  try {
    await mongoose.connect(mongoURI, { dbName: 'dealershipsDB', serverSelectionTimeoutMS: 2000 });
    console.log("Connected to MongoDB at " + mongoURI);
  } catch (err) {
    console.log("Could not connect to external MongoDB, initializing MongoMemoryServer...");
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri, { dbName: 'dealershipsDB' });
      console.log("Connected to MongoMemoryServer at " + uri);
    } catch (memErr) {
      console.error("MongoDB connection failed:", memErr);
    }
  }

  try {
    await Reviews.deleteMany({});
    await Reviews.insertMany(reviews_data['reviews']);
    await Dealerships.deleteMany({});
    await Dealerships.insertMany(dealerships_data['dealerships']);
    console.log("Database seeded successfully.");
  } catch (error) {
    console.error("Error populating database:", error);
  }
}
initDB();

// Express route to home
app.get('/', async (req, res) => {
    res.send("Welcome to the Mongoose API");
});

// Express route to fetch all reviews
app.get('/fetchReviews', async (req, res) => {
  try {
    const documents = await Reviews.find();
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching documents' });
  }
});

// Express route to fetch reviews by a particular dealer
app.get('/fetchReviews/dealer/:id', async (req, res) => {
  try {
    const documents = await Reviews.find({dealership: req.params.id});
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching documents' });
  }
});

// Express route to fetch all dealerships
app.get('/fetchDealers', async (req, res) => {
  try {
    const documents = await Dealerships.find();
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching documents' });
  }
});

// Express route to fetch Dealers by a particular state
app.get('/fetchDealers/:state', async (req, res) => {
  try {
    const documents = await Dealerships.find({ state: req.params.state });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching documents' });
  }
});

// Express route to fetch dealer by a particular id
app.get('/fetchDealer/:id', async (req, res) => {
  try {
    const documents = await Dealerships.find({ id: parseInt(req.params.id) });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching documents' });
  }
});

// Express route to insert review
app.post('/insert_review', express.raw({ type: '*/*' }), async (req, res) => {
  let data;
  if (typeof req.body === 'string') {
    data = JSON.parse(req.body);
  } else if (Buffer.isBuffer(req.body)) {
    data = JSON.parse(req.body.toString());
  } else {
    data = req.body;
  }
  const documents = await Reviews.find().sort({ id: -1 });
  let new_id = (documents.length > 0 && documents[0]['id']) ? documents[0]['id'] + 1 : 1;

  const review = new Reviews({
    "id": new_id,
    "name": data['name'],
    "dealership": data['dealership'],
    "review": data['review'],
    "purchase": data['purchase'],
    "purchase_date": data['purchase_date'],
    "car_make": data['car_make'],
    "car_model": data['car_model'],
    "car_year": data['car_year'],
  });

  try {
    const savedReview = await review.save();
    res.json(savedReview);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Error inserting review' });
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
