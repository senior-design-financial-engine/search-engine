#!/bin/bash

# CI/CD Utilities for managing secret parameters

# Function to set parameters in AWS Systems Manager Parameter Store
set_parameter() {
  local name=$1
  local value=$2
  local type=${3:-"String"}  # Default to String type
  local description=${4:-""}
  
  aws ssm put-parameter \
    --name "$name" \
    --value "$value" \
    --type "$type" \
    --description "$description" \
    --overwrite
    
  echo "Parameter '$name' set successfully"
}

# Function to get parameters from AWS Systems Manager Parameter Store
get_parameter() {
  local name=$1
  local with_decryption=${2:-"false"}  # Default to not decrypt
  
  if [ "$with_decryption" = "true" ]; then
    aws ssm get-parameter \
      --name "$name" \
      --with-decryption \
      --query "Parameter.Value" \
      --output text
  else
    aws ssm get-parameter \
      --name "$name" \
      --query "Parameter.Value" \
      --output text
  fi
}

# Set up Elasticsearch configuration parameters
setup_es_parameters() {
  local environment=${1:-"dev"}
  local endpoint=$2
  local api_key=$3
  local index=${4:-"financial_news"}
  
  # Set parameters with prefix for environment
  set_parameter "/${environment}/search_engine/es_endpoint" "$endpoint"
  
  # Use SecureString for API key
  set_parameter "/${environment}/search_engine/es_api_key" "$api_key" "SecureString" "Elasticsearch API key"
  
  set_parameter "/${environment}/search_engine/es_index" "$index"
  
  echo "Elasticsearch parameters set up for environment: $environment"
}

# Get Elasticsearch configuration parameters
get_es_parameters() {
  local environment=${1:-"dev"}
  
  local endpoint=$(get_parameter "/${environment}/search_engine/es_endpoint")
  local api_key=$(get_parameter "/${environment}/search_engine/es_api_key" "true")
  local index=$(get_parameter "/${environment}/search_engine/es_index")
  
  # Export as environment variables
  export ES_ENDPOINT="$endpoint"
  export ES_API_KEY="$api_key"
  export ES_INDEX="$index"
  
  echo "Elasticsearch parameters loaded for environment: $environment"
}

# If this script is being executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  # Check for command line arguments
  if [ $# -lt 1 ]; then
    echo "Usage: $0 [get|set] [environment] [additional parameters]"
    exit 1
  fi
  
  command=$1
  environment=${2:-"dev"}
  
  case "$command" in
    "get")
      get_es_parameters "$environment"
      ;;
    "set")
      if [ $# -lt 4 ]; then
        echo "Usage: $0 set [environment] [endpoint] [api_key] [index (optional)]"
        exit 1
      fi
      
      endpoint=$3
      api_key=$4
      index=${5:-"financial_news"}
      
      setup_es_parameters "$environment" "$endpoint" "$api_key" "$index"
      ;;
    *)
      echo "Unknown command: $command"
      echo "Usage: $0 [get|set] [environment] [additional parameters]"
      exit 1
      ;;
  esac
fi 