# 🚀 CryptoBoard: Your Ultimate Cryptocurrency News & Sentiment Dashboard

<img width="1922" height="953" alt="Screenshot 2025-07-15 at 10 46 51 AM" src="https://github.com/user-attachments/assets/7f93f920-401c-4ca9-9f84-6811fd8bdc59" />

*A glimpse of the CryptoBoard dashboard, featuring interactive charts and aggregated news.*

## ✨ Overview

**CryptoBoard** is a dynamic web application designed to be your one-stop dashboard for staying informed about the cryptocurrency world. It aggregates real-time news from top sources, analyzes market sentiment, identifies trending topics, and visualizes cryptocurrency growth data. Whether you're a crypto enthusiast, an investor, or just curious, CryptoBoard provides actionable insights at a glance.

## 🌟 Features

* **📰 Multi-Source News Aggregation**: Fetches and displays the latest cryptocurrency-related articles from:
    * **The Guardian**
    * **The New York Times**
    * **Reddit (r/cryptocurrency)**
* **🧐 Advanced Sentiment Analysis**:
    * **Categorized Sentiment**: Articles are analyzed for sentiment and categorized into "Strongly Positive," "Positive," "Neutral," "Negative," and "Strongly Negative" for intuitive understanding.
    * **Sentiment Distribution Pie Charts**: Visualizes the proportion of each sentiment category for articles from Reddit, NYTimes, and The Guardian, allowing for quick comparison of each source's overall tone.
    * **Detailed Sentiment Scatter Plot (with Jitter & Zoom)**: A refined article-level scatter plot that uses **jittering** to reduce overlap, **colors points by sentiment category** for immediate visual insight, and offers **interactive zoom and pan** functionality to explore dense data points in detail.
* **🔥 Trending Topics**: Identifies and displays the top 20 most frequently mentioned keywords across all aggregated articles, helping you quickly spot what's buzzing in the crypto space.
* **📈 Cryptocurrency Growth Chart**: Tracks and projects the price growth of major cryptocurrencies (e.g., Bitcoin), providing historical data and linear regression-based future projections.
* **🔍 Intuitive Search & Filtering**: Easily search for articles by keywords with autosuggestions and filter news by source.
* **📄 Pagination**: Efficiently browse through large volumes of articles with built-in pagination for each news source.
* **🔒 User Authentication (Planned/Partial)**: Includes a foundational backend for user registration and login using JWTs, ready for future expansion into personalized features.

## 🛠️ Technologies Used

CryptoBoard is built with a robust MERN (MongoDB, Express.js, React.js, Node.js) stack, enhanced with specialized libraries for data analysis and visualization.

### Backend

* **Node.js & Express.js**: The powerful runtime environment and web framework for building the API.
* **MongoDB Atlas**: A cloud-hosted NoSQL database for storing aggregated articles and user data.
    * **`mongodb` (Native Driver)**: For existing news collection interactions.
    * **`mongoose`**: For defining schemas and interacting with the `User` model.
* **`axios`**: Promise-based HTTP client for making API requests to external news sources (Guardian, NYT, Reddit, CoinGecko).
* **`cors`**: Middleware to enable Cross-Origin Resource Sharing.
* **`dotenv`**: For managing environment variables securely.
* **`sentiment`**: A Node.js library for sentiment analysis of text.
* **`natural`**: A general natural language processing (NLP) library for tasks like tokenization (used for keyword extraction).
* **`node-cache`**: A caching module for Node.js to improve API response times for frequently requested data.
* **`node-cron`**: For scheduling automated tasks, such as refreshing cached data hourly.
* **`coingecko-api`**: A wrapper for the CoinGecko API to fetch cryptocurrency market data.
* **`bcryptjs`**: For hashing user passwords securely.
* **`jsonwebtoken` (JWT)**: For generating and verifying authentication tokens.

### Frontend

* **React.js**: A declarative, component-based JavaScript library for building the user interface.
* **Material-UI (MUI)**: A comprehensive React UI framework for beautiful and responsive components.
* **`axios`**: For making HTTP requests to the backend API.
* **`react-chartjs-2`**: React wrapper for Chart.js, used for rendering interactive data visualizations.
* **`chart.js`**: Flexible charting library for displaying various data representations.
* **`chartjs-adapter-date-fns`**: Date adapter for Chart.js, enabling time-based scales.
* **`regression`**: A JavaScript library for performing linear regression (used for price projections).
* **`chartjs-plugin-zoom`**: A Chart.js plugin enabling interactive zoom and pan on charts.
* **`react-router-dom`**: For client-side routing, managing navigation between different views (e.g., login, dashboard).

✉️ **Contact**
For any questions or feedback, please reach out to: [Udish Kumar](https://www.linkedin.com/in/iudishkumar/)