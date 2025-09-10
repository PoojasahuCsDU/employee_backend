# Use Node 18 slim image
FROM node:18

# Set working directory
WORKDIR /app

# Copy only package.json and package-lock.json first
COPY package*.json ./

# Install only production dependencies
RUN npm install 

# Copy the rest of the project files
COPY . .

# Expose the port your app will run on (default 3000, or whatever your app uses)
EXPOSE 8080

# Start the server
CMD ["node", "index.js"]
