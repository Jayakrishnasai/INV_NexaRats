# Docker Configuration - NSE Project

1\. Inventory Backend Dockerfile

**File Path:** `./NexaratsINV/NexaratsINV/backend/Dockerfile`

```dockerfile
# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm install --production
EXPOSE 5000
CMD ["npm", "start"]
```

---

### 2\. WhatsApp Service Dockerfile

**File Path:** `./NexaratsINV/NexaratsINV/whatsapp/Dockerfile`

```dockerfile
# Standalone service with Puppeteer dependencies
FROM node:20-slim

# Install Puppeteer dependencies for Chromium
RUN apt-get update && apt-get install -y \
    gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 \
    libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 \
    libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 \
    libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 \
    libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
    libxtst6 ca-certificates fonts-liberation libappindicator1 \
    libnss3 lsb-release xdg-utils wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Persistence volume for session profile
VOLUME /app/.wwebjs_auth

EXPOSE 5005
CMD ["npm", "start"]
```

---

### 3\. Docker Compose (Root)

**File Path:** `./docker-compose.yml`

```yaml
version: '3.8'

services:
  backend:
    build: ./NexaratsINV/NexaratsINV/backend
    ports:
      - "5000:5000"
    env_file: ./NexaratsINV/NexaratsINV/backend/.env
  
  whatsapp:
    build: ./NexaratsINV/NexaratsINV/whatsapp
    ports:
      - "5005:5005"
    volumes:
      - wa_auth:/app/.wwebjs_auth
    env_file: ./NexaratsINV/NexaratsINV/whatsapp/.env

volumes:
  wa_auth:
```

> \[!TIP\]  
> Make sure to create the [.env](cci:7://file:///c:/Users/saisu/OneDrive/Desktop/NSE/NSE/NexaratsINV/NexaratsINV/backend/.env:0:0-0:0) files in the respective directories before running `docker-compose up --build`. The WhatsApp service specifically needs the `wa_auth` volume to keep you logged in when the container restarts.