const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { MongoClient } = require("mongodb");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = parseInt(process.env.PORT) || 8082;

// MongoDB Setup (replace with your MongoDB credentials)
const encodedPassword = encodeURIComponent("Karma@181818181");
const uri = `mongodb+srv://udishkum:${encodedPassword}@cluster0.2gusddi.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let db;
let guardianCollection;
let newsCollection;

// Connect to MongoDB
client.connect()
    .then(() => {
        console.log("Connected to MongoDB");
        db = client.db('cryptoboard');
        guardianCollection = db.collection('guardian_articles'); // for Guardian articles
        newsCollection = db.collection('newsapi_articles'); // for NewsAPI articles
    })
    .catch(err => {
        console.error("MongoDB Connection Error:", err);
        process.exit();
    });

/**
 * The Guardian Data Collection Route using API (Fetching All Pages)
 */
app.get('/fetchGuardianArticles', async (req, res) => {
    const API_KEY = 'c5be12ec-9f2f-4ba2-8e1c-ee89971ab1ed';  // Replace with your Guardian API key
    const BASE_URL = 'https://content.guardianapis.com/search';
    const query = 'cryptocurrency';
    let allArticles = [];
    let currentPage = 1;
    let totalPages = 1;

    try {
        // Step 1: Remove all existing documents from the collection
        await guardianCollection.deleteMany({});
        console.log('Existing articles removed from MongoDB.');

        // Step 2: Fetch new articles from The Guardian API
        while (currentPage <= totalPages) {
            // Build the API URL with pagination
            const url = `${BASE_URL}?q=${query}&page-size=200&page=${currentPage}&api-key=${API_KEY}`;

            // Fetch the current page
            const response = await axios.get(url);

            // Add the results to the allArticles array
            const articles = response.data.response.results;
            allArticles = allArticles.concat(articles);

            // Set the total pages from the response on the first request
            if (currentPage === 1) {
                totalPages = response.data.response.pages;
                console.log(`Total pages to fetch: ${totalPages}`);
            }

            console.log(`Fetched page ${currentPage} of ${totalPages}`);
            currentPage++;
        }

        console.log(`Total articles fetched: ${allArticles.length}`);

        // Step 3: Insert all articles into MongoDB
        if (allArticles.length) {
            await guardianCollection.insertMany(allArticles);
            console.log(`Successfully inserted ${allArticles.length} articles into MongoDB.`);
        } else {
            return res.json({ message: 'No articles found from The Guardian API' });
        }

        // Step 4: Fetch the newly stored articles and return them
        const storedArticles = await guardianCollection.find().toArray();
        res.json(storedArticles);

    } catch (error) {
        console.error("Error fetching Guardian articles:", error);
        res.status(500).json({ message: 'Error fetching Guardian articles' });
    }
});

app.get('/fetchNewsApiArticles', async (req, res) => {
    const API_KEY = '757779f1d7624dc596312c866acbf3dd';  // NewsAPI key
    const BASE_URL = 'https://newsapi.org/v2/everything';
    const query = 'cryptocurrency';
    const queryInTitle = 'cryptocurrency';
    let allArticles = [];

    try {
        // Step 1: Remove all existing documents from the collection
        await newsCollection.deleteMany({});
        console.log('Existing articles removed from MongoDB.');

        // Step 2: Build the API URL and fetch the articles from NewsAPI
        const url = `${BASE_URL}?q=${query}&qInTitle=${queryInTitle}&apiKey=${API_KEY}`;
        const response = await axios.get(url);

        // Add the fetched articles to the allArticles array
        const articles = response.data.articles;

        // Step 3: Remove the 'id' field from each article's source
        articles.forEach(article => {
            if (article.source && article.source.id) {
                delete article.source.id;  // Remove the 'id' field
            }
        });

        allArticles = allArticles.concat(articles);

        console.log(`Total articles fetched from NewsAPI: ${allArticles.length}`);

        // Step 4: Insert all articles into MongoDB
        if (allArticles.length) {
            await newsCollection.insertMany(allArticles);
            console.log(`Successfully inserted ${allArticles.length} articles into MongoDB.`);
        } else {
            return res.json({ message: 'No articles found from NewsAPI' });
        }

        // Step 5: Fetch the newly stored articles and return them
        const storedArticles = await newsCollection.find().toArray();
        res.json(storedArticles);

    } catch (error) {
        console.error("Error fetching NewsAPI articles:", error);
        res.status(500).json({ message: 'Error fetching NewsAPI articles' });
    }
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
