// config.js
module.exports = {
    PORT: process.env.PORT || 8082,

    // MongoDB configuration
    MONGODB: {
        USERNAME: process.env.MONGODB_USERNAME || 'default_username',
        PASSWORD: process.env.MONGODB_PASSWORD || 'default_password',
        CLUSTER_HOST: process.env.MONGODB_CLUSTER_HOST || 'cluster0.mongodb.net',
        DB_NAME: process.env.MONGODB_DB_NAME || 'cryptoboard',
        COLLECTIONS: {
            GUARDIAN: 'guardian_articles',
            NYTIMES: 'nytimes_articles',
            REDDIT: 'reddit_articles'
        }
    },

    // API Keys
    API_KEYS: {
        GUARDIAN: process.env.GUARDIAN_API_KEY || 'default_guardian_key',
        NYTIMES: process.env.NYTIMES_API_KEY || 'default_nytimes_key'
    },

    // Reddit configuration
    REDDIT: {
        BASE_URL: 'https://oauth.reddit.com/search',
        TOKEN_URL: 'https://www.reddit.com/api/v1/access_token',
        CLIENT_ID_SECRET: process.env.REDDIT_CLIENT_ID_SECRET || 'default_client_id_secret',
        USERNAME: process.env.REDDIT_USERNAME || 'default_reddit_username',
        PASSWORD: process.env.REDDIT_PASSWORD || 'default_reddit_password'
    }
};