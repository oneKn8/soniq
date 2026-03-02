#!/bin/bash

# ===========================================
# Set Environment Variables for Cloud Run
# ===========================================
# Run this AFTER deployment to add your secrets
# Usage: ./setup-env-cloudrun.sh

PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="us-central1"
SERVICE_NAME="soniq-api"

echo "=========================================="
echo "Setting Environment Variables"
echo "=========================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found"
    echo "Create .env from .env.example and fill in your values"
    exit 1
fi

# Load .env file and build env vars string
ENV_VARS=""
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ $key =~ ^#.*$ ]] && continue
    [[ -z $key ]] && continue

    # Remove quotes from value
    value=$(echo "$value" | sed 's/^["'"'"']//;s/["'"'"']$//')

    # Skip if value is a placeholder
    [[ $value == *"your-"* ]] && continue
    [[ $value == *"[YOUR-"* ]] && continue
    [[ $value == *"[PROJECT]"* ]] && continue

    # Add to env vars string
    if [ -n "$ENV_VARS" ]; then
        ENV_VARS="${ENV_VARS},${key}=${value}"
    else
        ENV_VARS="${key}=${value}"
    fi
done < .env

# Update Cloud Run service with environment variables
echo "Updating service with environment variables..."
gcloud run services update ${SERVICE_NAME} \
    --region ${REGION} \
    --update-env-vars="${ENV_VARS}"

echo ""
echo "Environment variables set successfully!"
echo ""
echo "Verify with:"
echo "  gcloud run services describe ${SERVICE_NAME} --region ${REGION}"
