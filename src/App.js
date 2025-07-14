import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  TextField,
  Chip,
  Grid,
  Card,
  CardContent,
  Link,
  Pagination,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { Scatter, Line } from 'react-chartjs-2';
import { Chart as ChartJS, Tooltip, Legend, PointElement, LinearScale, CategoryScale, TimeScale, LineElement } from 'chart.js';
import 'chartjs-adapter-date-fns';
import regression from 'regression';
import './App.css';

// Register required elements
ChartJS.register(Tooltip, Legend, PointElement, LinearScale, CategoryScale, TimeScale, LineElement);

function App() {
  const [articles, setArticles] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [guardianPage, setGuardianPage] = useState(1);
  const [nytimesPage, setNytimesPage] = useState(1);
  const [redditPage, setRedditPage] = useState(1);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const ARTICLES_PER_PAGE = 10;
  const apiUrl = process.env.REACT_APP_API_URL;
  const [growthData, setGrowthData] = useState([]);
  const [projectedData, setProjectedData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const articlesRes = await axios.get(`${apiUrl}/articles`);
        const trendingRes = await axios.get(`${apiUrl}/trending`);
        setArticles(articlesRes.data);
        setFilteredArticles(articlesRes.data);
        setTrendingTopics(trendingRes.data);
      } catch (err) {
        setError("Failed to fetch articles or trending topics.");
        console.error("Error fetching initial data:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchGrowthData = async () => {
      try {
        const response = await axios.get(`${apiUrl}/crypto-growth`, {
          params: {
            id: 'bitcoin',
            days: '365',
            interval: 'daily',
          },
        });
        const data = response.data;

        const parsedGrowthData = data.map(point => ({
          date: new Date(point.date),
          price: point.price,
        }));

        setGrowthData(parsedGrowthData);

        const regressionData = parsedGrowthData.map((point, index) => [index, point.price]);
        const result = regression.linear(regressionData);

        const projectedData = [];
        const lastIndex = regressionData.length - 1;
        for (let i = 1; i <= 30; i++) {
          const x = lastIndex + i;
          const y = result.predict(x)[1];
          projectedData.push({
            date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
            price: y
          });
        }
        setProjectedData(projectedData);
      } catch (error) {
        console.error('Error fetching growth data:', error);
        setError("Failed to fetch cryptocurrency growth data.");
      }
    };

    fetchData();
    fetchGrowthData();
  }, [apiUrl]);

  const growthChartData = {
    labels: [
      ...growthData.map(data => data.date),
      ...projectedData.map(data => data.date)
    ],
    datasets: [
      {
        label: 'Bitcoin Price (USD)',
        data: growthData.map(data => data.price),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
      {
        label: 'Projected Price (USD)',
        data: [...new Array(growthData.length).fill(null), ...projectedData.map(data => data.price)],
        fill: false,
        borderColor: 'rgb(255, 99, 132)',
        borderDash: [5, 5],
        tension: 0.1,
      },
    ],
  };

  const growthChartOptions = {
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'month',
          tooltipFormat: 'MMM dd, yyyy',
        },
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Price (USD)',
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

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

  const sentimentData = {
    labels: ['Sentiment Scores'],
    datasets: [
      {
        label: 'Reddit',
        data: articles.filter(a => a.source === 'reddit').map((article, index) => ({
          x: index,
          y: article.sentiment,
          backgroundColor: getSentimentColor(article.sentiment),
          label: article.title,
        })),
        pointBackgroundColor: articles.filter(a => a.source === 'reddit').map(article => getSentimentColor(article.sentiment)),
        pointRadius: 5,
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
        pointRadius: 5,
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
        pointRadius: 5,
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
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: '#2c3e50' }}>
        <Toolbar>
          <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            CryptoBoard 🚀
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" height="200px">
            <CircularProgress />
            <Typography variant="h6" sx={{ ml: 2 }}>Loading data...</Typography>
          </Box>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        )}
        {!loading && !error && (
          <>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Search Articles 🔍
              </Typography>
              <TextField
                fullWidth
                label="Enter keywords"
                variant="outlined"
                value={searchTerm}
                onChange={handleSearchChange}
                aria-label="Search Articles"
              />
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Cryptocurrency Growth Chart 📈
              </Typography>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ height: 400 }}>
                    <Line data={growthChartData} options={growthChartOptions} />
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Trending Topics 🔥
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {trendingTopics.map(topic => (
                  <Chip
                    key={topic.keyword}
                    label={`#${topic.keyword} (${topic.count})`}
                    onClick={() => handleTrendingClick(topic)}
                    color="primary"
                    clickable
                    sx={{
                      backgroundColor: '#e74c3c',
                      color: 'white',
                      fontWeight: 'bold',
                      '&:hover': {
                        backgroundColor: '#c0392b',
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Grid container spacing={4}>
              {['guardian', 'nytimes', 'reddit'].map((source) => (
                <Grid item xs={12} md={6} lg={4} key={source}>
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" gutterBottom>
                      {source === 'guardian' ? 'The Guardian Articles 📰' : source === 'nytimes' ? 'NYTimes Articles 🗞️' : 'Reddit Articles 📢'}
                    </Typography>
                    {paginateArticles(filteredArticles.filter(a => a.source === source), source === 'guardian' ? guardianPage : source === 'nytimes' ? nytimesPage : redditPage).length > 0 ? (
                      <Box>
                        {paginateArticles(filteredArticles.filter(a => a.source === source), source === 'guardian' ? guardianPage : source === 'nytimes' ? nytimesPage : redditPage).map((article, index) => (
                          <Card
                            key={index}
                            variant="outlined"
                            sx={{
                              mb: 2,
                              borderLeft: `5px solid ${getSentimentColor(article.sentiment)}`,
                              transition: 'all 0.3s ease-in-out',
                              '&:hover': {
                                boxShadow: 3,
                                transform: 'translateY(-2px)',
                              },
                            }}
                          >
                            <CardContent>
                              <Typography variant="body1">
                                <Link href={article.url || article.link} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ fontWeight: 'bold' }}>
                                  {article.title}
                                </Link>
                              </Typography>
                            </CardContent>
                          </Card>
                        ))}
                        <Box display="flex" justifyContent="center" mt={3}>
                          <Pagination
                            count={Math.ceil(filteredArticles.filter(a => a.source === source).length / ARTICLES_PER_PAGE)}
                            page={source === 'guardian' ? guardianPage : source === 'nytimes' ? nytimesPage : redditPage}
                            onChange={source === 'guardian' ? handleGuardianPageChange : source === 'nytimes' ? handleNytimesPageChange : handleRedditPageChange}
                            variant="text"
                            shape="rounded"
                            color="primary"
                            size="large"
                            showFirstButton
                            showLastButton
                            sx={{
                              '& .MuiPaginationItem-root': {
                                fontSize: '1.1rem',
                                margin: '0 6px',
                                borderRadius: '8px',
                                transition: 'background-color 0.3s ease, transform 0.2s ease',
                                '&:hover': {
                                  backgroundColor: 'rgba(25, 118, 210, 0.1)',
                                  transform: 'scale(1.05)',
                                },
                              },
                              '& .MuiPaginationItem-root.Mui-selected': {
                                backgroundColor: '#1976d2',
                                color: 'white',
                                fontWeight: 'bold',
                                '&:hover': {
                                  backgroundColor: '#1565c0',
                                },
                              },
                              '& .MuiPaginationItem-ellipsis': {
                                opacity: 0.7,
                              },
                            }}
                          />
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">No articles found for this source.</Typography>
                    )}
                  </Box>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ mt: 4, mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Sentiment Chart 📊
              </Typography>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ height: 500 }}>
                    <Scatter data={sentimentData} options={sentimentOptions} />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </>
        )}
      </Container>
    </>
  );
}

export default App;