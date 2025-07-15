import React, { useState, useEffect, useRef } from 'react'; // Import useRef for chart instance
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
  Alert,
  Button // <--- Make sure Button is imported for the Reset Zoom button
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { Scatter, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  Tooltip,
  Legend,
  PointElement,
  LinearScale,
  CategoryScale,
  TimeScale,
  LineElement,
  ArcElement,
} from 'chart.js';

// Import and register chartjs-plugin-zoom
import zoomPlugin from 'chartjs-plugin-zoom';

import 'chartjs-adapter-date-fns';
import regression from 'regression';

import './App.css';

// Register required elements for Line, Scatter, Pie charts, and the Zoom plugin
ChartJS.register(
  Tooltip,
  Legend,
  PointElement,
  LinearScale,
  CategoryScale,
  TimeScale,
  LineElement,
  ArcElement,
  zoomPlugin // Register the zoom plugin
);

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

  const [sentimentDistribution, setSentimentDistribution] = useState({
    Reddit: {},
    NYTimes: {},
    Guardian: {}
  });

  // Ref for the sentiment chart instance to programmatically reset zoom
  const sentimentChartRef = useRef(null);

  // Helper function to add jitter to X-axis
  const addJitter = (index) => {
    // Add a small random value (e.g., between -0.5 and 0.5)
    // Adjust the multiplier (5) for more or less jitter based on data density
    return index + (Math.random() - 0.5) * 5;
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

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

  useEffect(() => {
    const newDistribution = {
      Reddit: {
        'Strongly Positive': 0, 'Positive': 0, 'Neutral': 0, 'Negative': 0, 'Strongly Negative': 0
      },
      NYTimes: {
        'Strongly Positive': 0, 'Positive': 0, 'Neutral': 0, 'Negative': 0, 'Strongly Negative': 0
      },
      Guardian: {
        'Strongly Positive': 0, 'Positive': 0, 'Neutral': 0, 'Negative': 0, 'Strongly Negative': 0
      },
    };

    articles.forEach(article => {
      const category = getSentimentCategory(article.sentiment);
      const sourceKey = article.source === 'guardian' ? 'Guardian' : article.source === 'nytimes' ? 'NYTimes' : 'Reddit';
      if (newDistribution[sourceKey] && newDistribution[sourceKey][category] !== undefined) {
        newDistribution[sourceKey][category]++;
      }
    });
    setSentimentDistribution(newDistribution);
  }, [articles]);

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

  // Function to get color based on sentiment score
  const getSentimentColor = (score) => {
    if (score >= 10) return 'rgba(0, 128, 0, 0.8)'; // Darker Green for Strongly Positive
    if (score > 2) return 'rgba(60, 179, 113, 0.8)'; // Medium Green for Positive
    if (score >= -2 && score <= 2) return 'rgba(255, 165, 0, 0.8)'; // Orange for Neutral
    if (score < -2 && score >= -10) return 'rgba(255, 99, 71, 0.8)'; // Light Red for Negative
    if (score < -10) return 'rgba(220, 20, 60, 0.8)'; // Darker Red for Strongly Negative
    return 'rgba(150, 150, 150, 0.8)'; // Default/Grey for undefined
  };

  // Function to get sentiment category
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

  // Data for individual Pie Charts
  const createPieChartData = (sourceName) => {
    const dataForSource = sentimentDistribution[sourceName];
    const categories = ['Strongly Positive', 'Positive', 'Neutral', 'Negative', 'Strongly Negative'];
    const colors = categories.map(cat => {
      // Use representative scores for color mapping
      if (cat === 'Strongly Positive') return getSentimentColor(15);
      if (cat === 'Positive') return getSentimentColor(5);
      if (cat === 'Neutral') return getSentimentColor(0);
      if (cat === 'Negative') return getSentimentColor(-5);
      if (cat === 'Strongly Negative') return getSentimentColor(-15);
      return 'rgba(150,150,150,0.8)';
    });

    return {
      labels: categories,
      datasets: [
        {
          data: categories.map(cat => dataForSource[cat] || 0),
          backgroundColor: colors,
          borderColor: 'white',
          borderWidth: 2,
        },
      ],
    };
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right',
        labels: {
          font: {
            size: 12,
          },
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => {
            const label = tooltipItem.label || '';
            const value = tooltipItem.raw;
            const total = tooltipItem.dataset.data.reduce((acc, val) => acc + val, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
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

  // Data for the Sentiment Analysis Chart (UPDATED WITH JITTER AND TOOLTIP DATA)
  const sentimentData = {
    labels: ['Sentiment Scores'], // This label is often not directly used in scatter charts with multiple datasets
    datasets: [
      {
        label: 'Reddit',
        data: articles.filter(a => a.source === 'reddit').map((article, index) => ({
          x: addJitter(index), // Apply jitter
          y: article.sentiment,
          articleTitle: article.title, // Add for tooltip
          source: 'Reddit', // Add for tooltip
        })),
        pointBackgroundColor: (context) => getSentimentColor(context.raw.y), // Color by sentiment score
        pointRadius: 4,
        hoverRadius: 6,
        borderColor: (context) => getSentimentColor(context.raw.y),
        borderWidth: 1,
        pointBorderColor: 'rgba(255,255,255,0.6)', // White border for better separation
        pointBorderWidth: 0.5,
      },
      {
        label: 'NYTimes',
        data: articles.filter(a => a.source === 'nytimes').map((article, index) => ({
          x: addJitter(index), // Apply jitter
          y: article.sentiment,
          articleTitle: article.title, // Add for tooltip
          source: 'NYTimes', // Add for tooltip
        })),
        pointBackgroundColor: (context) => getSentimentColor(context.raw.y),
        pointRadius: 4,
        hoverRadius: 6,
        borderColor: (context) => getSentimentColor(context.raw.y),
        borderWidth: 1,
        pointBorderColor: 'rgba(255,255,255,0.6)',
        pointBorderWidth: 0.5,
      },
      {
        label: 'The Guardian',
        data: articles.filter(a => a.source === 'guardian').map((article, index) => ({
          x: addJitter(index), // Apply jitter
          y: article.sentiment,
          articleTitle: article.title, // Add for tooltip
          source: 'The Guardian', // Add for tooltip
        })),
        pointBackgroundColor: (context) => getSentimentColor(context.raw.y),
        pointRadius: 4,
        hoverRadius: 6,
        borderColor: (context) => getSentimentColor(context.raw.y),
        borderWidth: 1,
        pointBorderColor: 'rgba(255,255,255,0.6)',
        pointBorderWidth: 0.5,
      }
    ],
  };

  // Options for the Sentiment Analysis Chart (UPDATED FOR ZOOM AND TOOLTIP)
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
            if (context.tick.value === 2 || context.tick.value === -2 || context.tick.value === 10 || context.tick.value === -10) {
              return 2; // Thicker lines for category boundaries
            }
            return 1;
          },
          color: function(context) {
            if (context.tick.value === 2 || context.tick.value === -2) return 'rgba(0, 0, 0, 0.5)'; // Neutral zone boundaries
            if (context.tick.value === 10 || context.tick.value === -10) return 'rgba(0, 0, 0, 0.3)'; // Strong sentiment boundaries
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
            // Access properties from raw data (which includes articleTitle and source)
            const articleTitle = tooltipItem.raw.articleTitle;
            const sentimentScore = tooltipItem.raw.y;
            const sentimentCategory = getSentimentCategory(sentimentScore);
            const source = tooltipItem.raw.source; // Retrieve source from raw data
            return `Title: ${articleTitle}\nSource: ${source}\nScore: ${sentimentScore.toFixed(2)}\nCategory: ${sentimentCategory}`;
          }
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 4,
        displayColors: false, // Set to false because colors are based on sentiment, not dataset label color
      },
      zoom: { // Zoom plugin configuration
        zoom: {
          wheel: {
            enabled: true, // Enable zooming with mouse wheel
            // modifierKey: 'ctrl', // Optional: require CTRL key for zoom (Mac: Cmd)
          },
          pinch: {
            enabled: true // Enable pinch zooming on touch devices
          },
          mode: 'xy', // Enable zooming on both X and Y axes
        },
        pan: {
          enabled: true, // Enable panning
          mode: 'xy', // Enable panning on both X and Y axes
          // modifierKey: 'alt', // Optional: require ALT key for pan
        },
        limits: { // Optional: Set limits for zooming/panning
          // Setting x limits based on actual data length + some buffer for jitter
          x: { min: -50, max: articles.length + 50 },
          y: { min: -25, max: 25 },
        },
      },
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
  };

  // Function to reset zoom (can be triggered by a button)
  const resetZoom = () => {
    if (sentimentChartRef.current) {
      sentimentChartRef.current.resetZoom();
    }
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

            {/* Individual Pie Charts for Sentiment Distribution */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Sentiment Distribution by Source 📊
              </Typography>
              <Grid container spacing={2}>
                {['Reddit', 'NYTimes', 'Guardian'].map((source) => (
                  <Grid item xs={12} md={4} key={source}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" align="center" gutterBottom>
                          {source}
                        </Typography>
                        <Box sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <Pie data={createPieChartData(source)} options={pieChartOptions} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
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

            {/* Detailed Sentiment Chart (Scatter) with improvements */}
            <Box sx={{ mt: 4, mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Detailed Sentiment Chart 📈 (Article-level)
                {/* Optional: Add a button to reset zoom */}
                <Button variant="outlined" onClick={resetZoom} sx={{ ml: 2, borderColor: '#1976d2', color: '#1976d2' }}>
                    Reset Zoom
                </Button>
              </Typography>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ height: 600 }}>
                    {/* Attach the ref to the Scatter component */}
                    <Scatter ref={sentimentChartRef} data={sentimentData} options={sentimentOptions} />
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