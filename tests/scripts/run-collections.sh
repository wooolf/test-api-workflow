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
  COLLECTION_NAME=$(basename "$collection" .json)
  echo "Running collection: $COLLECTION_NAME"
  
  # Run the collection with Newman
  newman run "$collection" \
    --reporters cli,htmlextra,ctrf-json \
    --reporter-htmlextra-export "./newman/$COLLECTION_NAME-report.html" \
    --reporter-ctrf-json-output-dir ./ctrf \
    --reporter-ctrf-json-output-file "$COLLECTION_NAME-report.json" \
    --reporter-ctrf-json-build-name "API Tests - $COLLECTION_NAME" \
    --reporter-ctrf-json-app-name "API Testing Demo" || OVERALL_STATUS=$?
  
  echo "Completed collection: $COLLECTION_NAME with status: $?"
done

# Return overall status
exit $OVERALL_STATUS