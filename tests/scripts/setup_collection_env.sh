#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Input Validation ---
if [ -z "$1" ]; then
  echo "Error: Collection path argument is required." >&2
  exit 1
fi

COLLECTION_PATH="$1"

# --- Derive Names ---
echo "Processing collection path: $COLLECTION_PATH"
collection_file=$(basename "$COLLECTION_PATH")
# Remove .json extension
collection_name="${collection_file%.json}"
echo "Derived collection name: $collection_name"

# Sanitize name for directory/artifact creation
# Allow alphanumeric, underscore, hyphen. Remove leading/trailing non-alphanumeric.
sanitized_name=$(echo "$collection_name" | tr -cd '[:alnum:]_-' | sed 's/^[^a-zA-Z0-9]*//;s/[^a-zA-Z0-9]*$//')
# Handle cases where sanitization results in empty string or just symbols
if [[ -z "$sanitized_name" || "$sanitized_name" =~ ^[^a-zA-Z0-9]+$ ]]; then
  echo "Warning: Sanitized name was empty or invalid, using default."
  sanitized_name="default_collection_$(date +%s)" # Add timestamp for uniqueness
fi
echo "Sanitized name: $sanitized_name"

# --- Define Directories ---
newman_dir="./newman/$sanitized_name"
ctrf_dir="./ctrf/$sanitized_name"
echo "Newman reports directory: $newman_dir"
echo "CTRF reports directory: $ctrf_dir"

# --- Create Directories ---
mkdir -p "$newman_dir"
mkdir -p "$ctrf_dir"
echo "Created directories."

# --- Output for GitHub Actions ---
# Use $GITHUB_OUTPUT environment file to set outputs
echo "collection_name=$collection_name" >> "$GITHUB_OUTPUT"
echo "sanitized_name=$sanitized_name" >> "$GITHUB_OUTPUT"
echo "newman_dir=$newman_dir" >> "$GITHUB_OUTPUT"
echo "ctrf_dir=$ctrf_dir" >> "$GITHUB_OUTPUT"

echo "Script finished successfully."