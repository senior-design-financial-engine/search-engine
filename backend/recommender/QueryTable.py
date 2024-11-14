import boto3
from datetime import datetime
from typing import Dict, List, Optional
import json

class QueryTable:
    def __init__(self, table_name: str = 'financial_queries'):
        """Initialize DynamoDB table connection."""
        self.dynamodb = boto3.resource('dynamodb')
        self.table_name = table_name
        self.table = self.dynamodb.Table(self.table_name)

    def create_table(self) -> None:
        """Create the DynamoDB table if it doesn't exist."""
        try:
            self.dynamodb.create_table(
                TableName=self.table_name,
                KeySchema=[
                    {'AttributeName': 'query_id', 'KeyType': 'HASH'},  # Partition key
                    {'AttributeName': 'timestamp', 'KeyType': 'RANGE'}  # Sort key
                ],
                AttributeDefinitions=[
                    {'AttributeName': 'query_id', 'AttributeType': 'S'},
                    {'AttributeName': 'timestamp', 'AttributeType': 'S'},
                    {'AttributeName': 'user_id', 'AttributeType': 'S'}
                ],
                GlobalSecondaryIndexes=[
                    {
                        'IndexName': 'user_queries_index',
                        'KeySchema': [
                            {'AttributeName': 'user_id', 'KeyType': 'HASH'},
                            {'AttributeName': 'timestamp', 'KeyType': 'RANGE'}
                        ],
                        'Projection': {'ProjectionType': 'ALL'},
                        'ProvisionedThroughput': {
                            'ReadCapacityUnits': 5,
                            'WriteCapacityUnits': 5
                        }
                    }
                ],
                ProvisionedThroughput={
                    'ReadCapacityUnits': 5,
                    'WriteCapacityUnits': 5
                }
            )
            self.table.wait_until_exists()
        except self.dynamodb.meta.client.exceptions.ResourceInUseException:
            pass  # Table already exists

    def log_query(
        self,
        query_text: str,
        filters: Optional[Dict] = None,
        user_id: Optional[str] = None,
        results_count: int = 0
    ) -> str:
        """Log a query to DynamoDB."""
        timestamp = datetime.utcnow().isoformat()
        query_id = f"{user_id or 'anonymous'}_{timestamp}"

        item = {
            'query_id': query_id,
            'timestamp': timestamp,
            'query_text': query_text,
            'filters': json.dumps(filters) if filters else None,
            'results_count': results_count,
            'user_id': user_id or 'anonymous'
        }

        self.table.put_item(Item=item)
        return query_id

    def get_user_queries(
        self,
        user_id: str,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None
    ) -> List[Dict]:
        """Retrieve queries for a specific user within a time range."""
        kwargs = {
            'IndexName': 'user_queries_index',
            'KeyConditionExpression': 'user_id = :uid',
            'ExpressionAttributeValues': {':uid': user_id}
        }

        if start_time and end_time:
            kwargs['KeyConditionExpression'] += ' AND timestamp BETWEEN :start AND :end'
            kwargs['ExpressionAttributeValues'].update({
                ':start': start_time,
                ':end': end_time
            })

        response = self.table.query(**kwargs)
        return response.get('Items', [])

    def get_query_history(
        self,
        query_id: str
    ) -> Optional[Dict]:
        """Retrieve a specific query by its ID."""
        response = self.table.get_item(Key={'query_id': query_id})
        return response.get('Item')