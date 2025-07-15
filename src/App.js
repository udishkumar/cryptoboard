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
import Autocomplete from '@mui/material/Autocomplete';
import { Scatter, Line, Bar } from 'react-chartjs-2'; // Added Bar
import { Chart as ChartJS, Tooltip, Legend, PointElement, LinearScale, CategoryScale, TimeScale, LineElement, BarElement } from 'chart.js'; // Added BarElement
import 'chartjs-adapter-date-fns';
import regression from 'regression';
// import AnnotationPlugin from 'chartjs-plugin-annotation'; // Uncomment if using annotations
import './App.css';

// Register required elements for Line, Scatter, and Bar charts
ChartJS.register(Tooltip, Legend, PointElement, LinearScale, CategoryScale, TimeScale, LineElement, BarElement);
// If using annotations, also register: ChartJS.register(AnnotationPlugin);

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
  const [suggestions, setSuggestions] = useState([]);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const ARTICLES_PER_PAGE = 10;
  const apiUrl = process.env.REACT_APP_API_URL;
  const [growthData, setGrowthData] = useState([]);
  const [projectedData, setProjectedData] = useState([]);
  const [sentimentDistribution, setSentimentDistribution] = useState({}); // New state for sentiment distribution

  // Effect for debouncing the search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Effect to filter articles and generate suggestions based on the debounced search term
  useEffect(() => {
    const updatedArticles = articles.filter(article =>
      article.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
    setFilteredArticles(updatedArticles);
    setGuardianPage(1);
    setNytimesPage(1);
    setRedditPage(1);

    if (debouncedSearchTerm.length > 2) {
      const allTitles = articles.map(article => article.title);
      const uniqueKeywords = new Set();

      allTitles.forEach(title => {
        const words = title.toLowerCase().split(/\W+/).filter(word => word.length > 0);
        words.forEach(word => {
          if (word.startsWith(debouncedSearchTerm.toLowerCase())) {
            uniqueKeywords.add(word);
          }
        });
        if (title.toLowerCase().startsWith(debouncedSearchTerm.toLowerCase())) {
            uniqueKeywords.add(title);
        }
      });
      setSuggestions(Array.from(uniqueKeywords).sort().slice(0, 10));
    } else {
      setSuggestions([]);
    }
  }, [debouncedSearchTerm, articles]);

  // Effect to calculate sentiment distribution whenever articles change
  useEffect(() => {
    const distribution = {
      'Strongly Positive': { Reddit: 0, NYTimes: 0, Guardian: 0 },
      'Positive': { Reddit: 0, NYTimes: 0, Guardian: 0 },
      'Neutral': { Reddit: 0, NYTimes: 0, Guardian: 0 },
      'Negative': { Reddit: 0, NYTimes: 0, Guardian: 0 },
      'Strongly Negative': { Reddit: 0, NYTimes: 0, Guardian: 0 },
    };

    articles.forEach(article => {
      const category = getSentimentCategory(article.sentiment);
      const source = article.source === 'guardian' ? 'Guardian' : article.source === 'nytimes' ? 'NYTimes' : 'Reddit';
      if (distribution[category] && distribution[category][source] !== undefined) {
        distribution[category][source]++;
      }
    });
    setSentimentDistribution(distribution);
  }, [articles]);

  // Initial data fetching and crypto growth data fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const articlesRes = await axios.get(`${apiUrl}/articles`);
        const trendingRes = await axios.get(`${apiUrl}/trending`);
        setArticles(articlesRes.data);
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

  // Data for the Cryptocurrency Growth Chart
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

  const handleSearchChange = (event, newValue) => {
    setSearchTerm(newValue || event.target.value || '');
  };

  const handleTrendingClick = (topic) => {
    setSearchTerm(topic.keyword);
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

  // Function to get color based on sentiment score (IMPROVED FOR CATEGORIES)
  const getSentimentColor = (score) => {
    if (score >= 10) return 'rgba(0, 128, 0, 0.8)'; // Darker Green for Strongly Positive
    if (score > 2) return 'rgba(60, 179, 113, 0.8)'; // Medium Green for Positive
    if (score >= -2 && score <= 2) return 'rgba(255, 165, 0, 0.8)'; // Orange for Neutral
    if (score < -2 && score >= -10) return 'rgba(255, 99, 71, 0.8)'; // Light Red for Negative
    if (score < -10) return 'rgba(220, 20, 60, 0.8)'; // Darker Red for Strongly Negative
    return 'rgba(150, 150, 150, 0.8)'; // Default/Grey for undefined
  };

  // Function to get sentiment category (NEW)
  const getSentimentCategory = (score) => {
    if (score >= 10) return 'Strongly Positive';
    if (score > 2) return 'Positive';
    if (score >= -2 && score <= 2) return 'Neutral';
    if (score < -2 && score >= -10) return 'Negative';
    if (score < -10) return 'Strongly Negative';
    return 'Undefined';
  };

  // Helper function to paginate articles
  const paginateArticles = (articles, page) => {
    const startIndex = (page - 1) * ARTICLES_PER_PAGE;
    return articles.slice(startIndex, startIndex + ARTICLES_PER_PAGE);
  };

  // Data for the Sentiment Distribution Chart (NEW)
  const sentimentDistributionData = {
    labels: ['Reddit', 'NYTimes', 'The Guardian'],
    datasets: [
      {
        label: 'Strongly Positive',
        data: [
          sentimentDistribution['Strongly Positive']?.Reddit || 0,
          sentimentDistribution['Strongly Positive']?.NYTimes || 0,
          sentimentDistribution['Strongly Positive']?.Guardian || 0,
        ],
        backgroundColor: getSentimentColor(15),
      },
      {
        label: 'Positive',
        data: [
          sentimentDistribution['Positive']?.Reddit || 0,
          sentimentDistribution['Positive']?.NYTimes || 0,
          sentimentDistribution['Positive']?.Guardian || 0,
        ],
        backgroundColor: getSentimentColor(5),
      },
      {
        label: 'Neutral',
        data: [
          sentimentDistribution['Neutral']?.Reddit || 0,
          sentimentDistribution['Neutral']?.NYTimes || 0,
          sentimentDistribution['Neutral']?.Guardian || 0,
        ],
        backgroundColor: getSentimentColor(0),
      },
      {
        label: 'Negative',
        data: [
          sentimentDistribution['Negative']?.Reddit || 0,
          sentimentDistribution['Negative']?.NYTimes || 0,
          sentimentDistribution['Negative']?.Guardian || 0,
        ],
        backgroundColor: getSentimentColor(-5),
      },
      {
        label: 'Strongly Negative',
        data: [
          sentimentDistribution['Strongly Negative']?.Reddit || 0,
          sentimentDistribution['Strongly Negative']?.NYTimes || 0,
          sentimentDistribution['Strongly Negative']?.Guardian || 0,
        ],
        backgroundColor: getSentimentColor(-15),
      },
    ],
  };

  const sentimentDistributionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: 'News Source',
          font: { size: 14, weight: 'bold' },
          color: '#555',
        },
        ticks: {
          font: { size: 12 },
          color: '#666',
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Articles',
          font: { size: 14, weight: 'bold' },
          color: '#555',
        },
        ticks: {
          font: { size: 12 },
          color: '#666',
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: { size: 14, weight: 'bold' },
          usePointStyle: true,
          boxWidth: 10,
        },
      },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => {
            const label = tooltipItem.dataset.label;
            const value = tooltipItem.raw;
            const sourceIndex = tooltipItem.dataIndex;
            const sourceTotal = sentimentDistributionData.datasets.reduce((sum, dataset) => sum + (dataset.data[sourceIndex] || 0), 0);
            const percentage = sourceTotal > 0 ? ((value / sourceTotal) * 100).toFixed(1) : 0;
            return `${label}: ${value} articles (${percentage}%)`;
          },
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 4,
        displayColors: true,
      },
    },
  };


  // Data for the Sentiment Analysis Chart (Updated with new color logic and point styling directly in datasets)
  const sentimentData = {
    labels: ['Sentiment Scores'],
    datasets: [
      {
        label: 'Reddit',
        data: articles.filter(a => a.source === 'reddit').map((article, index) => ({
          x: index,
          y: article.sentiment,
          label: article.title,
        })),
        pointBackgroundColor: (context) => getSentimentColor(context.raw.y),
        pointRadius: 4,
        hoverRadius: 6,
        borderColor: (context) => getSentimentColor(context.raw.y),
        borderWidth: 1,
      },
      {
        label: 'NYTimes',
        data: articles.filter(a => a.source === 'nytimes').map((article, index) => ({
          x: index,
          y: article.sentiment,
          label: article.title,
        })),
        pointBackgroundColor: (context) => getSentimentColor(context.raw.y),
        pointRadius: 4,
        hoverRadius: 6,
        borderColor: (context) => getSentimentColor(context.raw.y),
        borderWidth: 1,
      },
      {
        label: 'The Guardian',
        data: articles.filter(a => a.source === 'guardian').map((article, index) => ({
          x: index,
          y: article.sentiment,
          label: article.title,
        })),
        pointBackgroundColor: (context) => getSentimentColor(context.raw.y),
        pointRadius: 4,
        hoverRadius: 6,
        borderColor: (context) => getSentimentColor(context.raw.y),
        borderWidth: 1,
      }
    ],
  };

  // Options for the Sentiment Analysis Chart (Further improvised for analytical use)
  const sentimentOptions = {
    responsive: true,
    maintainAspectRatio: false,

    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Article Index',
          font: {
            size: 14,
            weight: 'bold',
          },
          color: '#555',
        },
        grid: {
          color: 'rgba(200, 200, 200, 0.2)',
          lineWidth: 1,
        },
        ticks: {
          font: {
            size: 12,
          },
          color: '#666',
        },
      },
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Sentiment Score',
          font: {
            size: 14,
            weight: 'bold',
          },
          color: '#555',
        },
        min: -20,
        max: 20,
        ticks: {
          stepSize: 5,
          font: {
            size: 12,
          },
          color: '#666',
        },
        grid: {
          color: 'rgba(200, 200, 200, 0.2)',
          lineWidth: 1,
          drawOnChartArea: true,
          drawTicks: false,
          drawBorder: false,
          lineWidth: function(context) {
            // Draw thicker lines at category boundaries
            if (context.tick.value === 2 || context.tick.value === -2 || context.tick.value === 10 || context.tick.value === -10) {
              return 2;
            }
            return 1;
          },
          color: function(context) {
            // Use different colors for category boundary lines
            if (context.tick.value === 2 || context.tick.value === -2) return 'rgba(0, 0, 0, 0.5)';
            if (context.tick.value === 10 || context.tick.value === -10) return 'rgba(0, 0, 0, 0.3)';
            return 'rgba(200, 200, 200, 0.2)';
          },
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: {
            size: 14,
            weight: 'bold'
          },
          usePointStyle: true,
          boxWidth: 10,
        },
      },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => {
            const datasetLabel = tooltipItem.dataset.label || '';
            const articleTitle = tooltipItem.raw.label;
            const sentimentScore = tooltipItem.raw.y;
            const sentimentCategory = getSentimentCategory(sentimentScore);
            return `${datasetLabel}: ${articleTitle} (Score: ${sentimentScore.toFixed(2)}, Category: ${sentimentCategory})`;
          }
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 4,
        displayColors: true,
      },
      // annotation: { // Uncomment and install 'chartjs-plugin-annotation' to use
      //   annotations: {
      //     neutralZone: {
      //       type: 'box',
      //       yMin: -2,
      //       yMax: 2,
      //       backgroundColor: 'rgba(255, 165, 0, 0.1)',
      //       borderColor: 'rgba(255, 165, 0, 0.2)',
      //       borderWidth: 1,
      //     },
      //     positiveZone: {
      //       type: 'box',
      //       yMin: 2,
      //       yMax: 20,
      //       backgroundColor: 'rgba(60, 179, 113, 0.05)',
      //       borderColor: 'rgba(60, 179, 113, 0.1)',
      //       borderWidth: 1,
      //     },
      //     negativeZone: {
      //       type: 'box',
      //       yMin: -20,
      //       yMax: -2,
      //       backgroundColor: 'rgba(255, 99, 71, 0.05)',
      //       borderColor: 'rgba(255, 99, 71, 0.1)',
      //       borderWidth: 1,
      //     }
      //   }
      // }
    },
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
              <Autocomplete
                freeSolo
                options={suggestions}
                value={searchTerm}
                onInputChange={handleSearchChange}
                onChange={(event, newValue) => {
                  setSearchTerm(newValue || '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    label="Enter keywords"
                    variant="outlined"
                    aria-label="Search Articles"
                  />
                )}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', backgroundColor: '#fdfdfd' } }}
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

            {/* NEW Sentiment Distribution Chart */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Sentiment Distribution by Source 📊
              </Typography>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ height: 400 }}>
                    <Bar data={sentimentDistributionData} options={sentimentDistributionOptions} />
                  </Box>
                </CardContent>
              </Card>
            </Box>
            {/* END NEW Sentiment Distribution Chart */}

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

            {/* IMPROVED Sentiment Scatter Chart */}
            <Box sx={{ mt: 4, mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Detailed Sentiment Chart 📈 (Article-level)
              </Typography>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ height: 600 }}>
                    <Scatter data={sentimentData} options={sentimentOptions} />
                  </Box>
                </CardContent>
              </Card>
            </Box>
            {/* END IMPROVED Sentiment Scatter Chart */}
          </>
        )}
      </Container>
    </>
  );
}

export default App;