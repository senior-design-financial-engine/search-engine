#!/usr/bin/env python3
"""
Lambda function to initialize SSM parameters for Financial News Engine
Triggered by CloudFormation Custom Resource
"""
import json
import boto3
import logging
import cfnresponse
import os
import traceback

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def create_or_update_parameter(ssm_client, name, value, param_type='String', description=None, overwrite=True):
    """Create or update an SSM parameter"""
    try:
        # Check if parameter exists
        try:
            ssm_client.get_parameter(Name=name)
            if not overwrite:
                logger.info(f"Parameter {name} already exists, skipping.")
                return True
        except ssm_client.exceptions.ParameterNotFound:
            pass
        
        # Create/update parameter
        params = {
            'Name': name,
            'Value': str(value),
            'Type': param_type,
            'Overwrite': overwrite,
            'Tier': 'Standard'
        }
        
        if description:
            params['Description'] = description
        
        ssm_client.put_parameter(**params)
        logger.info(f"Successfully created/updated parameter: {name}")
        return True
    except Exception as e:
        logger.error(f"Error creating/updating parameter {name}: {str(e)}")
        return False

def handler(event, context):
    """
    Lambda function handler triggered by CloudFormation Custom Resource
    """
    logger.info(f"Received event: {json.dumps(event)}")
    
    # Always initiate with a physical resource ID for CloudFormation
    physical_id = event.get('PhysicalResourceId', context.log_stream_name)
    
    # Default response
    response_data = {}
    success = True
    
    try:
        request_type = event['RequestType']
        region = os.environ.get('AWS_REGION', 'us-east-1')
        resource_properties = event['ResourceProperties']
        
        # Initialize SSM client
        ssm_client = boto3.client('ssm', region_name=region)
        
        if request_type == 'Create' or request_type == 'Update':
            # Get properties from event
            elasticsearch_url = resource_properties.get('ElasticsearchEndpoint', '')
            elasticsearch_api_key = resource_properties.get('ElasticsearchApiKey', '')
            elasticsearch_index = resource_properties.get('ElasticsearchIndex', 'financial_news')
            es_shards = resource_properties.get('EsNumberOfShards', '3')
            es_replicas = resource_properties.get('EsNumberOfReplicas', '2')
            environment = resource_properties.get('EnvironmentName', 'production')
            
            # Define parameters to create
            parameters = {
                '/financial-news/elasticsearch-url': {
                    'value': elasticsearch_url,
                    'type': 'String',
                    'description': 'Elasticsearch endpoint URL for Financial News Engine'
                },
                '/financial-news/elasticsearch-api-key': {
                    'value': elasticsearch_api_key,
                    'type': 'SecureString',
                    'description': 'Elasticsearch API key for authentication'
                },
                '/financial-news/elasticsearch-index': {
                    'value': elasticsearch_index,
                    'type': 'String',
                    'description': 'Elasticsearch index name for storing news data'
                },
                '/financial-news/es-number-of-shards': {
                    'value': str(es_shards),
                    'type': 'String',
                    'description': 'Number of shards for Elasticsearch index'
                },
                '/financial-news/es-number-of-replicas': {
                    'value': str(es_replicas),
                    'type': 'String',
                    'description': 'Number of replicas for Elasticsearch index'
                },
                '/financial-news/environment': {
                    'value': environment,
                    'type': 'String',
                    'description': 'Environment name (production, staging, development)'
                }
            }
            
            # Create/update parameters
            for name, param in parameters.items():
                result = create_or_update_parameter(
                    ssm_client, 
                    name, 
                    param['value'], 
                    param['type'], 
                    param.get('description'), 
                    True  # Always overwrite in CloudFormation context
                )
                if not result:
                    success = False
            
            if success:
                logger.info("Successfully initialized all SSM parameters")
                response_data = {"Message": "SSM Parameters initialized successfully"}
            else:
                logger.error("One or more parameters failed to initialize")
                response_data = {"Message": "Failed to initialize some parameters"}
        
        elif request_type == 'Delete':
            # Skip parameter deletion on stack delete to prevent disruption
            # Simply report success to CloudFormation
            logger.info("Delete request received - SSM parameters will be preserved")
            response_data = {"Message": "SSM Parameters preserved"}
        
    except Exception as e:
        logger.error(f"Exception: {str(e)}")
        logger.error(traceback.format_exc())
        success = False
        response_data = {"Error": str(e)}
    
    # Send response to CloudFormation
    cfnresponse.send(event, context, 
                    cfnresponse.SUCCESS if success else cfnresponse.FAILED, 
                    response_data, physical_id)
    
    return {
        'statusCode': 200 if success else 500,
        'body': json.dumps(response_data)
    } 