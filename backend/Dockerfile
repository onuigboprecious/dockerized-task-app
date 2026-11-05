# Use official lightweight Node.js LTS Alpine image
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Copy dependency manifests first for layer caching
COPY package*.json ./

# Install only production dependencies cleanly
RUN npm ci --only=production && npm cache clean --force

# Copy application source code
COPY src/ ./src/

# Change ownership to built-in non-root node user for security
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Expose the application port
EXPOSE 5000

# Start the Node.js REST API
CMD ["node", "src/server.js"]
