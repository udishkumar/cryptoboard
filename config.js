// config.js
module.exports = {
    PORT: 8082,

    // MongoDB configuration
    MONGODB: {
        USERNAME: 'udishkum',
        PASSWORD: 'Karma@181818181',
        CLUSTER_HOST: 'cluster0.2gusddi.mongodb.net',
        DB_NAME: 'cryptoboard',
        COLLECTIONS: {
            GUARDIAN: 'guardian_articles',
            NYTIMES: 'nytimes_articles',
            REDDIT: 'reddit_articles'
        }
    },

    // API Keys
    API_KEYS: {
        GUARDIAN: 'c5be12ec-9f2f-4ba2-8e1c-ee89971ab1ed',
        NYTIMES: 'wCuAbXRh08VZYQ39Bq0ZjcHOhVWtBME3'
    },

    // Reddit configuration
    REDDIT: {
        TOKEN_URL: 'https://www.reddit.com/api/v1/access_token',
        CLIENT_ID_SECRET: 'SGVxQWZOZGlubFhqTkxHa0FReWNkUTp2VFo1RlRuTDRVNV9tdHNlak1VNHlHWVp1eVVPMFE=',
        USERNAME: 'udishkumar1994@gmail.com',
        PASSWORD: 'Karma@181818181'
    }
};