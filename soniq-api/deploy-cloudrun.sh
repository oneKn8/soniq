#!/bin/bash

# ===========================================
# Soniq API - Google Cloud Run Deployment
# ===========================================

set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="us-central1"
SERVICE_NAME="soniq-api"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "=========================================="
echo "Soniq API - Cloud Run Deployment"
echo "=========================================="
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"
echo "=========================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud CLI not installed"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if logged in
if ! gcloud auth print-access-token &> /dev/null; then
    echo "Not logged in. Running gcloud auth login..."
    gcloud auth login
fi

# Set project
echo ""
echo "Step 1: Setting project..."
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo ""
echo "Step 2: Enabling required APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    secretmanager.googleapis.com

# Build and push image
echo ""
echo "Step 3: Building and pushing Docker image..."
gcloud builds submit --tag ${IMAGE_NAME}:latest .

# Deploy to Cloud Run
echo ""
echo "Step 4: Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME}:latest \
    --region ${REGION} \
    --platform managed \
    --port 3100 \
    --memory 1Gi \
    --cpu 2 \
    --min-instances 1 \
    --max-instances 10 \
    --timeout 3600 \
    --session-affinity \
    --allow-unauthenticated \
    --set-env-vars="NODE_ENV=production,PORT=3100"

# Get service URL
echo ""
echo "Step 5: Getting service URL..."
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format='value(status.url)')

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Service URL: ${SERVICE_URL}"
echo ""
echo "Next steps:"
echo "1. Set environment variables (see below)"
echo "2. Update SignalWire webhook to: ${SERVICE_URL}/signalwire/voice"
echo "3. Update SignalWire media stream to: wss://${SERVICE_URL#https://}/signalwire/stream"
echo ""
echo "=========================================="
