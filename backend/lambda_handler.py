import json
import logging
import os
from update_database import main as update_db

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def lambda_handler(event, context):
    """
    AWS Lambda handler for the Reddit and news scraper.
    This function is triggered by CloudWatch Events on a schedule.
    
    Args:
        event: AWS Lambda event
        context: AWS Lambda context
    
    Returns:
        dict: Response with status information
    """
    logger.info("Lambda function invoked with event: %s", json.dumps(event))
    
    try:
        # Check if this is a scheduled event
        if event.get('source') == 'aws.events':
            logger.info("Processing scheduled event")
            update_db(skip_scrape=False)
            return {
                'statusCode': 200,
                'body': json.dumps('Scheduled scraping and database update completed successfully')
            }
        
        # Check if this is a direct invocation with action
        action = event.get('action', '')
        if action == 'update_database':
            logger.info("Processing manual database update request")
            update_db(skip_scrape=False)
            return {
                'statusCode': 200,
                'body': json.dumps('Manual database update completed successfully')
            }
        
        # If no recognized pattern, just scrape the data
        logger.info("No specific action found, running default update")
        update_db(skip_scrape=False)
        return {
            'statusCode': 200,
            'body': json.dumps('Default scraping and database update completed successfully')
        }
        
    except Exception as e:
        logger.error("Error in lambda handler: %s", str(e), exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        } 