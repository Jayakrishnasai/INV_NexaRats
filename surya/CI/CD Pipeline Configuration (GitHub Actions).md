# CI/CD Pipeline Configuration (GitHub Actions)

You should save this content into a single file at the root of your repository in the following directory: `.github/workflows/ci.yml` (you will need to create the `.github` and `workflows` folders if they don't exist).

### CI/CD Pipeline Configuration

**File Path:** `./.github/workflows/ci.yml`

```yaml
name: NSE CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  # --- Stage 1: Analyze & Test ---
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install INV Backend Dependencies
        run: |
          cd NexaratsINV/NexaratsINV/backend
          npm install
          npm run build

      - name: Install INV Frontend Dependencies
        run: |
          cd NexaratsINV/NexaratsINV/frontend
          npm install
          npm run build

  # --- Stage 2: Build & Push Images ---
  # This part runs only on pushes to the main branch
  build-docker:
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to DockerHub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and Push Backend
        uses: docker/build-push-action@v5
        with:
          context: ./NexaratsINV/NexaratsINV/backend
          push: true
          tags: nexarats/backend:latest

      - name: Build and Push WhatsApp Service
        uses: docker/build-push-action@v5
        with:
          context: ./NexaratsINV/NexaratsINV/whatsapp
          push: true
          tags: nexarats/whatsapp:latest
```

> \[!IMPORTANT\]  
> To make this pipeline work, you must go to your GitHub Repository **Settings > Secrets and variables > Actions** and add the following two secrets:
> 
> 1.  `DOCKERHUB_USERNAME`: Your DockerHub username.
> 2.  `DOCKERHUB_TOKEN`: Your DockerHub Personal Access Token.