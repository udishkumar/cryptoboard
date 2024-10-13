import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Pagination from '@mui/material/Pagination';
import { Scatter } from 'react-chartjs-2'; // Import Chart.js scatter plot
import { Chart as ChartJS, Tooltip, Legend, PointElement, LinearScale } from 'chart.js';
import './App.css';

ChartJS.register(Tooltip, Legend, PointElement, LinearScale); // Register required chart.js elements

function App() {
  const [articles, setArticles] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [guardianPage, setGuardianPage] = useState(1);
  const [nytimesPage, setNytimesPage] = useState(1);
  const [redditPage, setRedditPage] = useState(1);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const ARTICLES_PER_PAGE = 10;
  const apiUrl = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const fetchData = async () => {
      const articlesRes = await axios.get(`${apiUrl}/articles`);
      const trendingRes = await axios.get(`${apiUrl}/trending`);
      setArticles(articlesRes.data);
      setFilteredArticles(articlesRes.data); // Set initial filtered articles
      setTrendingTopics(trendingRes.data);
    };
    fetchData();
  }, []);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    const updatedArticles = articles.filter(article =>
      article.title.toLowerCase().includes(event.target.value.toLowerCase())
    );
    setFilteredArticles(updatedArticles);
    setGuardianPage(1);
    setNytimesPage(1);
    setRedditPage(1);
  };

  const handleTrendingClick = (topic) => {
    setSearchTerm(topic.keyword);
    const updatedArticles = articles.filter(article =>
      article.title.toLowerCase().includes(topic.keyword.toLowerCase())
    );
    setFilteredArticles(updatedArticles);
    setGuardianPage(1);
    setNytimesPage(1);
    setRedditPage(1);
  };

  const handleGuardianPageChange = (event, value) => {
    setGuardianPage(value);
  };

  const handleNytimesPageChange = (event, value) => {
    setNytimesPage(value);
  };

  const handleRedditPageChange = (event, value) => {
    setRedditPage(value);
  };

  const getSentimentColor = (score) => {
    if (score > 0) return `rgba(0, 255, 0, ${Math.min(score / 5, 1)})`; // Green for positive
    if (score < 0) return `rgba(255, 0, 0, ${Math.min(Math.abs(score) / 5, 1)})`; // Red for negative
    return 'rgba(255, 255, 0, 1)'; // Yellow for neutral
  };

  const paginateArticles = (articles, page) => {
    const startIndex = (page - 1) * ARTICLES_PER_PAGE;
    return articles.slice(startIndex, startIndex + ARTICLES_PER_PAGE);
  };

  // Prepare chart data
  const sentimentData = {
    labels: ['Sentiment Scores'],
    datasets: [
      {
        label: 'Reddit',
        data: articles.filter(a => a.source === 'reddit').map((article, index) => ({
          x: index,
          y: article.sentiment,
          backgroundColor: getSentimentColor(article.sentiment),
          label: article.title, // Use title for the tooltip
        })),
        pointBackgroundColor: articles.filter(a => a.source === 'reddit').map(article => getSentimentColor(article.sentiment)),
        pointRadius: 5, // Adjust the size of the points
      },
      {
        label: 'NYTimes',
        data: articles.filter(a => a.source === 'nytimes').map((article, index) => ({
          x: index,
          y: article.sentiment,
          backgroundColor: getSentimentColor(article.sentiment),
          label: article.title,
        })),
        pointBackgroundColor: articles.filter(a => a.source === 'nytimes').map(article => getSentimentColor(article.sentiment)),
        pointRadius: 5, // Adjust the size of the points
      },
      {
        label: 'The Guardian',
        data: articles.filter(a => a.source === 'guardian').map((article, index) => ({
          x: index,
          y: article.sentiment,
          backgroundColor: getSentimentColor(article.sentiment),
          label: article.title,
        })),
        pointBackgroundColor: articles.filter(a => a.source === 'guardian').map(article => getSentimentColor(article.sentiment)),
        pointRadius: 5, // Adjust the size of the points
      }
    ],
  };

  const sentimentOptions = {
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Article Index',
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Sentiment Score',
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => {
            const dataIndex = tooltipItem.dataIndex;
            const dataset = tooltipItem.dataset;
            const articleTitle = dataset.data[dataIndex].label;
            const sentimentScore = dataset.data[dataIndex].y;
            return `${articleTitle}: Sentiment Score ${sentimentScore}`;
          }
        },
      },
    },
  };

  return (
    <div className="container">
      <h1 className="text-center">CryptoBoard</h1>
      <section className="trending-topics">
        <h2>Trending Topics</h2>
        <div className="topics-list">
          {trendingTopics.map(topic => (
            <span
              key={topic.keyword}
              className="trending-topic"
              onClick={() => handleTrendingClick(topic)}
            >
              #{topic.keyword} ({topic.count})
            </span>
          ))}
        </div>
      </section>

      <section className="search-section">
        <div className="mb-3">
          <label className="form-label">Search Articles:</label>
          <input
            type="text"
            className="form-control"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Enter keywords"
            aria-label="Search Articles"
          />
        </div>
      </section>


      {/* Guardian Articles Section */}
      <section className="articles-section">
        <h2>The Guardian Articles</h2>
        <ul>
          {paginateArticles(filteredArticles.filter(a => a.source === 'guardian'), guardianPage).map((article, index) => (
            <li key={index} style={{ borderLeftColor: getSentimentColor(article.sentiment) }}>
              <a href={article.url} target="_blank" rel="noopener noreferrer">
                {article.title}
              </a>
            </li>
          ))}
        </ul>
        <div className="pagination-wrapper">
          <Pagination
            count={Math.ceil(filteredArticles.filter(a => a.source === 'guardian').length / ARTICLES_PER_PAGE)}
            page={guardianPage}
            onChange={handleGuardianPageChange}
            variant="outlined"
            shape="rounded"
            color="primary"
          />
        </div>
      </section>

      {/* NYTimes Articles Section */}
      <section className="articles-section">
        <h2>NYTimes Articles</h2>
        <ul>
          {paginateArticles(filteredArticles.filter(a => a.source === 'nytimes'), nytimesPage).map((article, index) => (
            <li key={index} style={{ borderLeftColor: getSentimentColor(article.sentiment) }}>
              <a href={article.url} target="_blank" rel="noopener noreferrer">
                {article.title}
              </a>
            </li>
          ))}
        </ul>
        <div className="pagination-wrapper">
          <Pagination
            count={Math.ceil(filteredArticles.filter(a => a.source === 'nytimes').length / ARTICLES_PER_PAGE)}
            page={nytimesPage}
            onChange={handleNytimesPageChange}
            variant="outlined"
            shape="rounded"
            color="secondary"
          />
        </div>
      </section>

      {/* Reddit Articles Section */}
      <section className="articles-section">
        <h2>Reddit Articles</h2>
        <ul>
          {paginateArticles(filteredArticles.filter(a => a.source === 'reddit'), redditPage).map((article, index) => (
            <li key={index} style={{ borderLeftColor: getSentimentColor(article.sentiment) }}>
              <a href={article.link} target="_blank" rel="noopener noreferrer">
                {article.title}
              </a>
            </li>
          ))}
        </ul>
        <div className="pagination-wrapper">
          <Pagination
            count={Math.ceil(filteredArticles.filter(a => a.source === 'reddit').length / ARTICLES_PER_PAGE)}
            page={redditPage}
            onChange={handleRedditPageChange}
            variant="outlined"
            shape="rounded"
            color="primary"
          />
        </div>
      </section>

      {/* Sentiment Chart Section */}
      <section className="sentiment-chart-section">
        <h2>Sentiment Chart</h2>
        <Scatter
          data={sentimentData}
          options={sentimentOptions}
        />
      </section>
    </div>
  );
}

export default App;