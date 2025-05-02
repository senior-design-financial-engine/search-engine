#!/bin/bash

# Your API key
API_KEY="cnAxVV81VUJ1LXVFajl5Z0tHWlE6bldrVTQtTkRRTWFPbDQ3X0NTeXJyZw=="
ES_URL="https://fc9fa0b183414ca28ea4c7288ad74e23.us-east-1.aws.found.io:443/financial_news/_doc?pipeline=ent-search-generic-ingestion"

# Function to clean and encode text
clean_text() {
    echo "$1" | \
    iconv -f utf-8 -t ascii//TRANSLIT 2>/dev/null | \
    tr -cd '[:print:]' | \
    sed 's/"/\\"/g' | \
    sed "s/'/\\'/g"
}

# Function to determine sentiment category based on score
get_sentiment_category() {
    local score=$1
    # Using printf for more precise floating point comparison
    if (( $(printf "%.2f\n" "$score" | awk '{print ($1 > 0.3)}') )); then
        echo "positive"
    elif (( $(printf "%.2f\n" "$score" | awk '{print ($1 < -0.3)}') )); then
        echo "negative"
    else
        echo "neutral"
    fi
}

# Function to process Reddit articles
process_reddit_file() {
    local file="scraper/articles/reddit_threads.json"
    local source="reddit"
    
    echo "Processing Reddit articles from: $file"
    echo "----------------------------------------"
    
    # Check if file exists
    if [ ! -f "$file" ]; then
        echo "Error: File $file not found"
        return 1
    fi
    
    # Read the entire file into a variable first
    local json_content
    json_content=$(cat "$file")
    
    # Process each article
    while read -r article; do
        # Skip empty lines
        [ -z "$article" ] && continue
        
        # Extract fields from the nested structure and clean them
        headline=$(echo "$article" | jq -r '.post.title // empty')
        [ -n "$headline" ] && headline=$(clean_text "$headline")
        
        content=$(echo "$article" | jq -r '.summary // empty')
        [ -n "$content" ] && content=$(clean_text "$content")
        
        url=$(echo "$article" | jq -r '.post.url // empty')
        published_at=$(echo "$article" | jq -r '.post.createdAt // empty')
        sentiment_score=$(echo "$article" | jq -r '.sentiment.score // 0')
        
        # Skip if any required field is empty
        if [ -z "$headline" ] || [ -z "$content" ] || [ -z "$url" ]; then
            echo "Skipping article due to missing required fields"
            continue
        fi

        # Get sentiment category
        sentiment_category=$(get_sentiment_category "$sentiment_score")
        
        # Create JSON payload with proper escaping - matching original script structure
        payload="{
            \"headline\": \"$headline\",
            \"content\": \"$content\",
            \"source\": \"$source\",
            \"url\": \"$url\",
            \"published_at\": \"$published_at\",
            \"category\": \"news\",
            \"sentiment_score\": $sentiment_score,
            \"sentiment\": \"$sentiment_category\"
        }"

        # Debug: Print the payload
        echo "Sending payload for article: $headline"

        # Send to Elasticsearch and store the response
        response=$(curl -s -X POST "$ES_URL" \
            -H "Content-Type: application/json" \
            -H "Authorization: ApiKey $API_KEY" \
            -d "$payload")
        
        # Print processing information and response
        echo "----------------------------------------"
        echo "Processed: $headline"
        echo "Sentiment Category: $sentiment_category"
        echo "Sentiment Score: $sentiment_score"
        echo "Response from Elasticsearch:"
        echo "$response"
        echo "----------------------------------------"
        
        # Add a small delay to not overwhelm the server
        sleep 1
        
    done < <(echo "$json_content" | jq -c '.[]' 2>/dev/null)
}

# Process only Reddit articles
echo "Starting Reddit article ingestion..."
echo "----------------------------------------"
process_reddit_file
echo "----------------------------------------"
echo "Reddit articles processing complete!"
echo "----------------------------------------"
