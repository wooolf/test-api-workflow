#!/bin/bash
set -e

# Get list of collections
COLLECTIONS=($@)

# Check if any collections were found
if [ ${#COLLECTIONS[@]} -eq 0 ]; then
  echo "No collections found to run!"
  exit 1
fi

echo "Found ${#COLLECTIONS[@]} collections to run"

# Create directories
mkdir -p ./newman
mkdir -p ./ctrf

# Track overall status
OVERALL_STATUS=0

# Process each collection
for collection in "${COLLECTIONS[@]}"; do
  # Extract collection name without path and extension
  COLLECTION_FILE=$(basename "$collection")
  COLLECTION_NAME=$(basename "$collection" .json)
  
  # Extract the actual collection name from the JSON file
  ACTUAL_NAME=$(cat "$collection" | grep -o '"name": *"[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [ -z "$ACTUAL_NAME" ]; then
    ACTUAL_NAME=$COLLECTION_NAME
  fi
  
  echo "Running collection: $ACTUAL_NAME (file: $COLLECTION_FILE)"
  
  # Run the collection with Newman
  newman run "$collection" \
    --reporters cli,htmlextra,ctrf-json \
    --reporter-htmlextra-export "./newman/$COLLECTION_NAME-report.html" \
    --reporter-ctrf-json-output-dir ./ctrf \
    --reporter-ctrf-json-output-file "$COLLECTION_NAME-report.json" \
    --reporter-ctrf-json-build-name "API Tests - $ACTUAL_NAME" \
    --reporter-ctrf-json-app-name "$ACTUAL_NAME" || OVERALL_STATUS=$?
  
  echo "Completed collection: $ACTUAL_NAME with status: $?"
done

# Return overall status
exit $OVERALL_STATUS