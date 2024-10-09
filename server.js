const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { MongoClient } = require("mongodb");
const config = require('./config');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = config.PORT;

// MongoDB Setup
const username = encodeURIComponent(config.MONGODB.USERNAME);
const password = encodeURIComponent(config.MONGODB.PASSWORD);
const clusterHost = config.MONGODB.CLUSTER_HOST;
const dbName = config.MONGODB.DB_NAME;
const uri = `mongodb+srv://${username}:${password}@${clusterHost}/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let db;
let guardianCollection;
let nytCollection;
let redditCollection;

// Connect to MongoDB
client.connect()
    .then(() => {
        console.log("Connected to MongoDB");
        db = client.db(dbName);
        guardianCollection = db.collection(config.MONGODB.COLLECTIONS.GUARDIAN);
        nytCollection = db.collection(config.MONGODB.COLLECTIONS.NYTIMES);
        redditCollection = db.collection(config.MONGODB.COLLECTIONS.REDDIT);
    })
    .catch(err => {
        console.error("MongoDB Connection Error:", err);
        process.exit();
    });

// Function to extract hostname
function extractHostname(url) {
    if (!url) return 'Unknown';
    
    let hostname = url.includes("//") ? url.split('/')[2] : url.split('/')[0];
    hostname = hostname.split(':')[0].split('?')[0];
    const hostnameParts = hostname.split('.');
    return hostnameParts.length > 2 ? hostnameParts[hostnameParts.length - 2] : hostnameParts[0];
}

// Function to check if an article already exists in the database
function isArticleNew(existingArticles, newArticle) {
    return !existingArticles.some(article => article.url === newArticle.url);
}

// Function to get Reddit Access Token
async function getRedditAccessToken() {
    const { TOKEN_URL, CLIENT_ID_SECRET, USERNAME, PASSWORD } = config.REDDIT;

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('username', USERNAME);
    params.append('password', PASSWORD);

    try {
        const response = await axios.post(TOKEN_URL, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${CLIENT_ID_SECRET}`
            }
        });
        return response.data.access_token;
    } catch (error) {
        console.error('Error fetching Reddit access token:', error);
        throw new Error('Failed to fetch Reddit access token');
    }
}

/**
 * The Guardian Business API - Fetches and stores articles from The Guardian
 */
app.get('/guardian', async (req, res) => {
    const { GUARDIAN } = config.API_KEYS;
    const BASE_URL = 'https://content.guardianapis.com/search';
    const query = 'crypto';
    const pageSize = 200;
    
    try {
        const existingArticles = await guardianCollection.find().toArray();

        const firstPageUrl = `${BASE_URL}?q=${query}&page-size=${pageSize}&page=1&api-key=${GUARDIAN}`;
        const firstPageResponse = await axios.get(firstPageUrl);
        const totalPages = firstPageResponse.data.response.pages;

        const urls = [];
        for (let page = 1; page <= totalPages; page++) {
            const url = `${BASE_URL}?q=${query}&page-size=${pageSize}&page=${page}&api-key=${GUARDIAN}`;
            urls.push(url);
        }

        const fetchPagePromises = urls.map(url => axios.get(url));
        const responses = await Promise.all(fetchPagePromises);

        const allArticles = responses.flatMap(response => response.data.response.results);
        console.log(`Total articles fetched: ${allArticles.length}`);

        const newArticles = allArticles
            .map(article => ({
                publicationDate: article.webPublicationDate,
                title: article.webTitle,
                url: article.webUrl,
                source: extractHostname(article.webUrl)
            }))
            .filter(article => isArticleNew(existingArticles, article));

        if (newArticles.length) {
            await guardianCollection.insertMany(newArticles);
            console.log(`Successfully inserted ${newArticles.length} new Guardian articles into MongoDB.`);
        } else {
            console.log('No new Guardian articles found.');
        }

        const updatedArticles = await guardianCollection.find().toArray();
        res.json(updatedArticles);

    } catch (error) {
        console.error("Error fetching Guardian articles:", error);
        res.status(500).json({ message: 'Error fetching Guardian articles' });
    }
});

/**
 * The New York Times Business API - Fetches and stores articles from NYTimes
 */
app.get('/nytimes', async (req, res) => {
    const { NYTIMES } = config.API_KEYS;
    const BASE_URL = 'https://api.nytimes.com/svc/search/v2/articlesearch.json';
    const query = 'crypto';

    try {
        const existingArticles = await nytCollection.find().toArray();

        const url = `${BASE_URL}?q=${query}&api-key=${NYTIMES}`;
        const response = await axios.get(url);
        const articles = response.data.response.docs;

        const newArticles = articles
            .map(article => ({
                publicationDate: article.pub_date,
                title: article.headline.main,
                url: article.web_url,
                source: extractHostname(article.web_url)
            }))
            .filter(article => isArticleNew(existingArticles, article));

        if (newArticles.length) {
            await nytCollection.insertMany(newArticles);
            console.log(`Successfully inserted ${newArticles.length} new NYTimes articles into MongoDB.`);
        } else {
            console.log('No new NYTimes articles found.');
        }

        const updatedArticles = await nytCollection.find().toArray();
        res.json(updatedArticles);

    } catch (error) {
        console.error("Error fetching NYTimes articles:", error);
        res.status(500).json({ message: 'Error fetching NYTimes articles' });
    }
});

/**
 * The Reddit Business API - Fetches and stores posts from Reddit
 */
app.get('/reddit', async (req, res) => {
    const BASE_URL = 'https://oauth.reddit.com/search';
    const query = 'crypto';

    try {
        const accessToken = await getRedditAccessToken();
        const existingArticles = await redditCollection.find().toArray();

        const url = `${BASE_URL}?q=${query}`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'ChangeMeClient/0.1 by YourUsername',
                'Authorization': `bearer ${accessToken}`
            }
        });
        const posts = response.data.data.children;
        const totalResults = response.data.data.dist;

        const newPosts = posts
            .map(post => ({
                reddit: post.data.subreddit_name_prefixed || "",
                author: post.data.author_fullname || "",
                title: post.data.title || "",
                description: post.data.selftext || "",
                image: post.data.preview?.images?.[0]?.source?.url || "",
                source: extractHostname(post.data.url)
            }))
            .filter(post => isArticleNew(existingArticles, post));

        if (newPosts.length) {
            await redditCollection.insertMany(newPosts);
            console.log(`Successfully inserted ${newPosts.length} new Reddit articles into MongoDB.`);
        } else {
            console.log('No new Reddit articles found.');
        }

        const updatedPosts = await redditCollection.find().toArray();
        res.json({ totalResults, articles: updatedPosts });

    } catch (error) {
        console.error("Error fetching Reddit articles:", error);
        res.status(500).json({ message: 'Error fetching Reddit articles' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});