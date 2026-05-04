// src/index.js
const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const cors = require('cors');
const bodyParser = require('body-parser');

const typeDefs = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');
const createContext = require('./graphql/context');
const config = require('./config');

const allowlist = [
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://thoughtcanva.com",
]
const corsOptionsDelegate = function (req, callback) {
  var corsOptions;

  if (allowlist.indexOf(req.header("Origin")) !== -1) {
    corsOptions = {
      origin: true,
      credentials: true,
      methods: "POST, GET ,PUT, OPTIONS, DELETE",
    }; // reflect (enable) the requested origin in the CORS response
  } else {
    corsOptions = { origin: false }; // disable CORS for this request
  }

  callback(null, corsOptions); // callback expects two parameters: error and options
};
async function startServer() {
  const app = express();

  // Middleware
  app.use(cors(corsOptionsDelegate));
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Create Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
    formatError: (error) => {
      // Log error for monitoring
      console.error('GraphQL Error:', error);
      
      // Don't leak internal errors to client in production
      if (config.NODE_ENV === 'production') {
        return new Error('Internal server error');
      }
      return error;
    }
  });

  await server.start();

  // Apply middleware
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: createContext
    })
  );

  // Start server
  app.listen(config.PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${config.PORT}/graphql`);
    console.log(`📊 Health check at http://localhost:${config.PORT}/health`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});