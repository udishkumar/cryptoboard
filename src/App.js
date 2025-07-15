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
import Autocomplete from '@mui/material/Autocomplete'; // Import Autocomplete for autosuggestion
import { Scatter, Line } from 'react-chartjs-2';
import { Chart as ChartJS, Tooltip, Legend, PointElement, LinearScale, CategoryScale, TimeScale, LineElement } from 'chart.js';
import 'chartjs-adapter-date-fns';
import regression from 'regression';
import './App.css';

// Register required elements for Line and Scatter charts
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
  const [suggestions, setSuggestions] = useState([]); // State for autosuggestions
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(''); // State for debounced search term

  const ARTICLES_PER_PAGE = 10;
  const apiUrl = process.env.REACT_APP_API_URL;
  const [growthData, setGrowthData] = useState([]);
  const [projectedData, setProjectedData] = useState([]);

  // Effect for debouncing the search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms debounce delay

    // Cleanup function: Clear the timeout if searchTerm changes before the delay
    // This prevents setDebouncedSearchTerm from being called for every keystroke.
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]); // Re-run this effect only when searchTerm changes

  // Effect to filter articles and generate suggestions based on the debounced search term
  useEffect(() => {
    // Filter articles based on the debounced term
    const updatedArticles = articles.filter(article =>
      article.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
    setFilteredArticles(updatedArticles);
    // Reset pagination when the effective search term changes
    setGuardianPage(1);
    setNytimesPage(1);
    setRedditPage(1);

    // Generate suggestions from article titles (frontend approach)
    if (debouncedSearchTerm.length > 2) { // Only suggest after 2 characters
      const allTitles = articles.map(article => article.title);
      const uniqueKeywords = new Set();

      allTitles.forEach(title => {
        // Simple tokenization: split by non-word characters
        const words = title.toLowerCase().split(/\W+/).filter(word => word.length > 0);
        words.forEach(word => {
          if (word.startsWith(debouncedSearchTerm.toLowerCase())) {
            uniqueKeywords.add(word);
          }
        });
        // Also add the entire title if it starts with the debounced term
        if (title.toLowerCase().startsWith(debouncedSearchTerm.toLowerCase())) {
            uniqueKeywords.add(title);
        }
      });
      // Convert Set to Array, sort alphabetically, and limit to 10 suggestions
      setSuggestions(Array.from(uniqueKeywords).sort().slice(0, 10));
    } else {
      setSuggestions([]); // Clear suggestions if search term is too short
    }
  }, [debouncedSearchTerm, articles]); // Depend on debounced term and original articles

  // Initial data fetching and crypto growth data fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const articlesRes = await axios.get(`${apiUrl}/articles`);
        const trendingRes = await axios.get(`${apiUrl}/trending`);
        setArticles(articlesRes.data);
        // Initial filtering is now handled by the debouncedSearchTerm effect,
        // which will run once `articles` is set.
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

  // handleSearchChange now updates searchTerm, debouncing handles filtering
  const handleSearchChange = (event, newValue) => {
    // newValue is for Autocomplete's onChange (selection), event.target.value for onInputChange (typing)
    setSearchTerm(newValue || event.target.value || '');
  };

  const handleTrendingClick = (topic) => {
    setSearchTerm(topic.keyword);
    // Filtering will automatically happen via the debouncedSearchTerm effect
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
    if (score > 0) return `rgba(0, 255, 0, ${Math.min(score / 5, 1)})`; // Green for positive
    if (score < 0) return `rgba(255, 0, 0, ${Math.min(Math.abs(score) / 5, 1)})`; // Red for negative
    return 'rgba(255, 255, 0, 1)'; // Yellow for neutral
  };

  // Helper function to paginate articles
  const paginateArticles = (articles, page) => {
    const startIndex = (page - 1) * ARTICLES_PER_PAGE;
    return articles.slice(startIndex, startIndex + ARTICLES_PER_PAGE);
  };

  // Helper function to calculate average sentiment for a source
  const averageSentiment = (articles, source) => {
    const sourceArticles = articles.filter(a => a.source === source);
    if (sourceArticles.length === 0) return 0;
    const sum = sourceArticles.reduce((acc, article) => acc + article.sentiment, 0);
    return sum / sourceArticles.length;
  };

  // Data for the Sentiment Analysis Chart (Improved Scatter Plot)
  const sentimentData = {
    datasets: [
      {
        label: 'Reddit Articles',
        data: articles.filter(a => a.source === 'reddit').map((article) => ({
          x: article.sentiment,
          y: 'Reddit', // Fixed Y-axis label for the source
          backgroundColor: getSentimentColor(article.sentiment),
          label: article.title, // Article title for tooltip
        })),
        pointBackgroundColor: articles.filter(a => a.source === 'reddit').map(article => getSentimentColor(article.sentiment)),
        pointRadius: 6, // Slightly larger points for visibility
      },
      {
        label: 'NYTimes Articles',
        data: articles.filter(a => a.source === 'nytimes').map((article) => ({
          x: article.sentiment,
          y: 'NYTimes', // Fixed Y-axis label for the source
          backgroundColor: getSentimentColor(article.sentiment),
          label: article.title,
        })),
        pointBackgroundColor: articles.filter(a => a.source === 'nytimes').map(article => getSentimentColor(article.sentiment)),
        pointRadius: 6,
      },
      {
        label: 'The Guardian Articles',
        data: articles.filter(a => a.source === 'guardian').map((article) => ({
          x: article.sentiment,
          y: 'The Guardian', // Fixed Y-axis label for the source
          backgroundColor: getSentimentColor(article.sentiment),
          label: article.title,
        })),
        pointBackgroundColor: articles.filter(a => a.source === 'guardian').map(article => getSentimentColor(article.sentiment)),
        pointRadius: 6,
      },
      // Datasets for Average sentiment lines (type: 'line' within a scatter chart)
      {
        label: 'Reddit Avg. Sentiment',
        data: [{ x: averageSentiment(articles, 'reddit'), y: 'Reddit' }], // Single point for the line
        type: 'line', // This dataset will be rendered as a line
        borderColor: 'rgba(0, 0, 0, 0.7)', // Darker line for average
        borderWidth: 2,
        pointRadius: 0, // Hide points on the line
        fill: false,
        tooltipHidden: true, // Custom property to hide tooltip for this line
      },
      {
        label: 'NYTimes Avg. Sentiment',
        data: [{ x: averageSentiment(articles, 'nytimes'), y: 'NYTimes' }],
        type: 'line',
        borderColor: 'rgba(0, 0, 0, 0.7)',
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tooltipHidden: true,
      },
      {
        label: 'The Guardian Avg. Sentiment',
        data: [{ x: averageSentiment(articles, 'guardian'), y: 'The Guardian' }],
        type: 'line',
        borderColor: 'rgba(0, 0, 0, 0.7)',
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tooltipHidden: true,
      },
    ],
  };

  // Options for the Sentiment Analysis Chart
  const sentimentOptions = {
    scales: {
      x: {
        type: 'linear', // Linear scale for sentiment scores
        position: 'bottom',
        min: -1, // Sentiment score range from -1 to +1
        max: 1,
        title: {
          display: true,
          text: 'Sentiment Score (-1 Negative, 0 Neutral, +1 Positive)',
        },
        grid: {
          drawOnChartArea: true, // Keep grid lines
          color: (context) => {
            if (context.tick.value === 0) {
              return 'rgba(0, 0, 0, 0.5)'; // Darker line at 0 for neutral
            }
            return 'rgba(0, 0, 0, 0.1)'; // Lighter grid lines
          }
        },
        ticks: {
            stepSize: 0.2 // Show ticks every 0.2 units
        }
      },
      y: {
        type: 'category', // Category scale for news source labels
        labels: ['Reddit', 'NYTimes', 'The Guardian'], // Explicitly define the order of categories
        offset: true, // Centers the categories on their respective "tracks"
        title: {
          display: true,
          text: 'News Source',
        },
        grid: {
          display: false, // Hide horizontal grid lines for cleaner look
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          filter: function (legendItem, chartData) {
            // Only show labels for scatter datasets (hide line datasets by checking custom property)
            return !chartData.datasets[legendItem.datasetIndex].tooltipHidden;
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => {
            // Check if the dataset has the custom tooltipHidden property
            if (tooltipItem.dataset.tooltipHidden) {
                return null; // Hide tooltip for average lines
            }
            const articleTitle = tooltipItem.raw.label; // Get article title from raw data
            const sentimentScore = tooltipItem.raw.x; // Get sentiment score from raw data
            return `${articleTitle}: Sentiment Score ${sentimentScore.toFixed(2)}`; // Format score
          },
          title: (tooltipItems) => {
            // Show source as title for points
            return tooltipItems[0].raw.y;
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
              <Autocomplete
                freeSolo // Allows typing arbitrary values not in suggestions
                options={suggestions} // Array of suggestion strings
                value={searchTerm} // Controlled component value
                onInputChange={handleSearchChange} // Updates searchTerm as user types
                onChange={(event, newValue) => { // Handles selection from suggestions or pressing enter
                  setSearchTerm(newValue || ''); // Set search term to selected suggestion or empty string
                  // The debouncedSearchTerm effect will handle filtering
                }}
                renderInput={(params) => (
                  <TextField
                    {...params} // Spreads props like label, value, onChange, etc.
                    fullWidth
                    label="Enter keywords"
                    variant="outlined"
                    aria-label="Search Articles"
                  />
                )}
                // Apply existing TextField styling to the Autocomplete's input
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
                Sentiment Analysis by Source 📊
              </Typography>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ height: 500 }}>
                    <Scatter
                      data={sentimentData}
                      options={sentimentOptions}
                    />
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