<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/pdavim/Model-Tester-Tool/blob/main/public/model-test-tool-battle.png" />
</div>

# Run and deploy MODEL TEST TOOL

This contains everything you need to run your app locally.

View your app in: https://model-tool.innovaive.com

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deployment

### Using Docker

1. Build the image:
   `docker build -t model-tester -f dockerfile.txt .`
2. Run the container:
   `docker run -p 3001:3000 --env-file .env model-tester`

### Deploying to Dokploy

1. Link your repository to Dokploy.
2. Set the build type to **Docker Compose**.
3. Point the Dockerfile path to `dockerfile.txt`.
4. Add your environment variables (`OPENROUTER_API_KEY`, etc.) in the Dokploy dashboard.
5. Deploy!
