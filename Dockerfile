FROM node:20-alpine

WORKDIR /app

RUN npm install pm2 -g

# Copy package.json and install dependencies
COPY package.json .

RUN npm install

# Copy the rest of the application code
COPY . .

# Expose port 8080
EXPOSE 8080

# Command to run the application
# CMD ["npm", "run", "start"]
CMD ["npm" ,"run","pm2:dockerStart"]
